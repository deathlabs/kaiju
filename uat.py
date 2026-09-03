#!/usr/bin/env python3
"""
Interactive Kaiju TTX client.

Uses the kaiju-bot Keycloak client-credentials flow, then lets a tester
operate as a Facilitator, ISSM, or System Administrator against the same
Kaiju backend.

Python standard library only.
"""

from __future__ import annotations

import base64
import getpass
import json
import os
import subprocess
import textwrap
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

DEFAULT_API_URL = os.getenv("KAIJU_API_URL", "https://kaiju.uds.dev/api/v1")
DEFAULT_KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "https://sso.uds.dev")
DEFAULT_KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "uds")
DEFAULT_KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "kaiju-bot")

ROLE_FACILITATOR = "facilitator"
ROLE_ISSM = "information_system_security_manager"
ROLE_SYSADMIN = "system_administrator"

ROLE_LABELS = {
    ROLE_FACILITATOR: "Facilitator",
    ROLE_ISSM: "ISSM",
    ROLE_SYSADMIN: "System Administrator",
}


def clear() -> None:
    os.system("cls" if os.name == "nt" else "clear")


def pause(message: str = "Press Enter to continue...") -> None:
    input(f"\n{message}")


def rule(char: str = "─", width: int = 78) -> str:
    return char * width


def wrap(value: Any, width: int = 76, indent: int = 0) -> str:
    text = "" if value is None else str(value)
    prefix = " " * indent
    return textwrap.fill(
        text,
        width=width,
        initial_indent=prefix,
        subsequent_indent=prefix,
    )


def fmt_time(value: str | None) -> str:
    if not value:
        return "—"
    try:
        return (
            datetime.fromisoformat(value.replace("Z", "+00:00"))
            .astimezone()
            .strftime("%Y-%m-%d %H:%M:%S %Z")
        )
    except ValueError:
        return value


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def prompt_int(prompt: str, minimum: int = 1, maximum: int | None = None) -> int:
    while True:
        raw = input(prompt).strip()
        try:
            value = int(raw)
        except ValueError:
            print("Enter a number.")
            continue
        if value < minimum:
            print(f"Enter a value of at least {minimum}.")
            continue
        if maximum is not None and value > maximum:
            print(f"Enter a value no greater than {maximum}.")
            continue
        return value


def prompt_choice(
    title: str, choices: list[tuple[str, Any]], allow_back: bool = True
) -> Any:
    while True:
        print(f"\n{title}")
        print(rule())
        for i, (label, _) in enumerate(choices, start=1):
            print(f" {i}. {label}")
        if allow_back:
            print(" 0. Back")

        value = input("\nSelection: ").strip()
        if allow_back and value == "0":
            return None

        try:
            index = int(value)
        except ValueError:
            print("Invalid selection.")
            continue

        if 1 <= index <= len(choices):
            return choices[index - 1][1]

        print("Invalid selection.")


def get_client_secret(client_id: str) -> str:
    env_secret = os.getenv("KEYCLOAK_CLIENT_SECRET")
    if env_secret:
        return env_secret

    print("\nAttempting to read the Keycloak client secret from Kubernetes...")

    command = [
        "uds",
        "zarf",
        "tools",
        "kubectl",
        "get",
        "secret",
        "-n",
        "kaiju",
        f"sso-client-{client_id}",
        "-o",
        "jsonpath={.data.secret}",
    ]

    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
        )
        encoded = result.stdout.strip()
        if encoded:
            secret = base64.b64decode(encoded).decode().strip()
            if secret:
                print("Client secret loaded from Kubernetes.")
                return secret
    except (FileNotFoundError, subprocess.CalledProcessError, ValueError) as exc:
        print(f"Could not load it automatically: {exc}")

    secret = getpass.getpass("Keycloak client secret: ").strip()
    if not secret:
        raise SystemExit("A client secret is required.")
    return secret


class KaijuClient:
    def __init__(
        self,
        api_url: str,
        keycloak_url: str,
        realm: str,
        client_id: str,
        client_secret: str,
    ) -> None:
        self.api_url = api_url.rstrip("/")
        self.keycloak_url = keycloak_url.rstrip("/")
        self.realm = realm
        self.client_id = client_id
        self.client_secret = client_secret

        self.access_token = ""
        self.token_expires_at = 0.0

    def authenticate(self) -> None:
        url = (
            f"{self.keycloak_url}/realms/"
            f"{urllib.parse.quote(self.realm)}/protocol/openid-connect/token"
        )

        form = urllib.parse.urlencode(
            {
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            }
        ).encode()

        request = urllib.request.Request(
            url,
            data=form,
            method="POST",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                data = json.loads(response.read().decode())
        except urllib.error.HTTPError as exc:
            body = exc.read().decode(errors="replace")
            raise RuntimeError(
                f"Keycloak authentication failed: HTTP {exc.code}\n{body}"
            ) from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Could not reach Keycloak: {exc.reason}") from exc

        token = data.get("access_token")
        if not token:
            raise RuntimeError("Keycloak did not return an access_token.")

        self.access_token = token
        expires_in = int(data.get("expires_in", 300))
        self.token_expires_at = time.time() + expires_in

    def ensure_token(self) -> None:
        if not self.access_token or time.time() >= self.token_expires_at - 30:
            self.authenticate()

    def request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
    ) -> Any:
        self.ensure_token()

        url = f"{self.api_url}/{path.lstrip('/')}"
        payload = None
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.access_token}",
        }

        if body is not None:
            payload = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"

        request = urllib.request.Request(
            url,
            data=payload,
            method=method,
            headers=headers,
        )

        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                raw = response.read()
                if response.status == 204 or not raw:
                    return None
                return json.loads(raw.decode())
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode(errors="replace")
            if exc.code == 401:
                self.access_token = ""
                self.token_expires_at = 0
            raise RuntimeError(f"Kaiju API HTTP {exc.code}: {raw}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Could not reach Kaiju: {exc.reason}") from exc

    def get(self, path: str) -> Any:
        return self.request("GET", path)

    def post(self, path: str, body: dict[str, Any]) -> Any:
        return self.request("POST", path, body)

    def patch(self, path: str, body: dict[str, Any]) -> Any:
        return self.request("PATCH", path, body)


class KaijuTTX:
    def __init__(self, client: KaijuClient) -> None:
        self.client = client
        self.exercise: dict[str, Any] | None = None
        self.role: str | None = None
        self.participant: dict[str, Any] | None = None

    @property
    def exercise_id(self) -> str:
        if not self.exercise:
            raise RuntimeError("No exercise loaded.")
        return self.exercise["id"]

    def refresh(self) -> None:
        if self.exercise:
            self.exercise = self.client.get(f"exercises/{self.exercise_id}/")

    def select_exercise(self) -> bool:
        exercises = self.client.get("exercises/")

        if not exercises:
            print("\nNo exercises exist.")
            pause()
            return False

        choices = []
        for item in exercises:
            label = (
                f"{item['title']}  "
                f"[{item['status']}]  "
                f"{fmt_time(item['scheduled_start_time'])}"
            )
            choices.append((label, item["id"]))

        exercise_id = prompt_choice("Select Exercise", choices, allow_back=False)
        self.exercise = self.client.get(f"exercises/{exercise_id}/")
        return True

    def select_role(self) -> bool:
        role = prompt_choice(
            "Select Persona",
            [
                ("Facilitator", ROLE_FACILITATOR),
                ("ISSM", ROLE_ISSM),
                ("System Administrator", ROLE_SYSADMIN),
            ],
            allow_back=False,
        )
        self.role = role
        self.participant = None

        matches = [
            p for p in self.exercise.get("participants", []) if p["role"] == role
        ]

        if not matches:
            print(
                f"\nThis exercise does not contain a {ROLE_LABELS[role]} participant."
            )
            pause()
            return False

        if len(matches) == 1:
            self.participant = matches[0]
            return True

        selected = prompt_choice(
            f"Select {ROLE_LABELS[role]} Participant",
            [
                (
                    f"{p['first_name']} {p['last_name']}"
                    + (f" <{p['email']}>" if p.get("email") else ""),
                    p,
                )
                for p in matches
            ],
            allow_back=False,
        )
        self.participant = selected
        return True

    def header(self) -> None:
        clear()
        print("KAIJU // INTERACTIVE TTX CLIENT")
        print(rule("═"))
        print(f"Exercise : {self.exercise['title']}")
        print(f"Status   : {self.exercise['status']}")
        print(f"Persona  : {ROLE_LABELS[self.role]}")
        print(
            f"Identity : {self.participant['first_name']} "
            f"{self.participant['last_name']}"
        )
        print(rule("═"))

    def show_brief(self) -> None:
        self.refresh()
        self.header()

        print("\nSCENARIO")
        print(rule())
        print(wrap(self.exercise["scenario"]))

        print("\nOBJECTIVES")
        print(rule())
        for objective in self.exercise.get("objectives", []):
            print(f"{objective['title']}: {objective['description']}")

        print("\nREFERENCES / PLANS")
        print(rule())
        refs = self.exercise.get("references", [])
        if refs:
            for ref in refs:
                print(f"- {ref['title']}")
                print(f"  {ref['url']}")
        else:
            print("None.")

        print("\nSCHEDULE")
        print(rule())
        print(f"Scheduled Start: {fmt_time(self.exercise['scheduled_start_time'])}")
        print(f"Scheduled End  : {fmt_time(self.exercise['scheduled_end_time'])}")
        print(f"Actual Start   : {fmt_time(self.exercise.get('started_at'))}")
        print(f"Actual End     : {fmt_time(self.exercise.get('ended_at'))}")
        pause()

    def show_msel(self) -> None:
        self.refresh()
        self.header()
        print("\nMASTER SCENARIO EVENT LIST")
        print(rule())

        events = sorted(self.exercise.get("events", []), key=lambda e: e["number"])
        if not events:
            print("No events.")
            pause()
            return

        for event in events:
            if event.get("ended_at"):
                state = "ENDED"
            elif event.get("started_at"):
                state = "ACTIVE"
            else:
                state = "PENDING"

            print(f"\nEVENT {event['number']} // {event['description']} // {state}")
            print(
                "Objectives: "
                + ", ".join(o["title"] for o in event.get("objectives", []))
            )
            print(
                f"Started: {fmt_time(event.get('started_at'))} | "
                f"Ended: {fmt_time(event.get('ended_at'))}"
            )

            for inject in event.get("injects", []):
                if inject.get("ended_at"):
                    inject_state = "CLOSED"
                elif inject.get("started_at"):
                    inject_state = "DELIVERED"
                else:
                    inject_state = "QUEUED"

                recipient = inject["recipient"]
                print(
                    f"  [{inject_state}] Inject {inject['number']} "
                    f"{inject['sender']} -> "
                    f"{recipient['first_name']} {recipient['last_name']}"
                )
                print(f"    Scheduled: {fmt_time(inject['scheduled_start_time'])}")
                print(wrap(inject["message"], indent=4))
                if inject.get("responses"):
                    for response in inject["responses"]:
                        who = response["participant"]
                        print(
                            f"    RESPONSE {who['first_name']} "
                            f"{who['last_name']}: {response['text']}"
                        )

        pause()

    def record_finding(self) -> None:
        self.header()
        finding_type = prompt_choice(
            "Finding Type",
            [
                ("Sustainment", "sustainment"),
                ("Improvement", "improvement"),
            ],
            allow_back=True,
        )
        if finding_type is None:
            return

        topic = input("Topic: ").strip()
        observation = input("Observation: ").strip()
        recommendation = input("Recommendation: ").strip()

        if not topic or not observation or not recommendation:
            print("\nTopic, observation, and recommendation are required.")
            pause()
            return

        self.client.post(
            f"exercises/{self.exercise_id}/findings/",
            {
                "type": finding_type,
                "topic": topic,
                "observation": observation,
                "recommendation": recommendation,
            },
        )
        self.refresh()
        print("\nFinding recorded.")
        pause()

    def participant_injects(self) -> list[tuple[dict[str, Any], dict[str, Any]]]:
        results = []
        for event in self.exercise.get("events", []):
            for inject in event.get("injects", []):
                if inject["recipient"]["id"] == self.participant["id"]:
                    results.append((event, inject))
        return results

    def respond_to_inject(self) -> None:
        self.refresh()
        injects = self.participant_injects()

        if not injects:
            self.header()
            print("\nNo injects are assigned to you.")
            pause()
            return

        choices = []
        for event, inject in injects:
            if inject.get("ended_at"):
                state = "CLOSED"
            elif inject.get("started_at"):
                state = "OPEN"
            else:
                state = "QUEUED"

            choices.append(
                (
                    (
                        f"{inject['number']} [{state}] ",
                        f"Event {event['number']} - {inject['sender']}",
                    ),
                    (event, inject),
                )
            )

        selected = prompt_choice("My Injects", choices)
        if selected is None:
            return

        event, inject = selected
        self.header()
        print(f"\nINJECT {inject['number']}")
        print(rule())
        print(f"From      : {inject['sender']}")
        print(f"Delivered : {fmt_time(inject.get('started_at'))}")
        print(f"Scheduled : {fmt_time(inject.get('scheduled_start_time'))}")
        print("\nMESSAGE")
        print(wrap(inject["message"]))

        print("\nMY PREVIOUS RESPONSES")
        mine = [
            r
            for r in inject.get("responses", [])
            if r["participant"]["id"] == self.participant["id"]
        ]
        if mine:
            for response in mine:
                print(f"- {fmt_time(response['created_at'])}: {response['text']}")
        else:
            print("None.")

        if not inject.get("started_at"):
            print("\nThis inject has not been delivered by the facilitator yet.")
            pause()
            return

        if inject.get("ended_at"):
            print("\nThis inject is closed.")
            pause()
            return

        print("\nEnter your response/action. Leave blank to cancel.")
        text = input("> ").strip()
        if not text:
            return

        self.client.post(
            (
                f"exercises/{self.exercise_id}/events/{event['id']}/"
                f"injects/{inject['id']}/responses/"
            ),
            {
                "participant_id": self.participant["id"],
                "text": text,
            },
        )

        print("\nResponse submitted.")
        pause()

    def participant_menu(self) -> None:
        while True:
            self.refresh()
            self.header()

            open_injects = 0
            for _, inject in self.participant_injects():
                if inject.get("started_at") and not inject.get("ended_at"):
                    open_injects += 1

            print(f"\nOpen injects addressed to you: {open_injects}")

            choice = prompt_choice(
                "Participant Actions",
                [
                    ("View exercise brief", "brief"),
                    ("View MSEL / exercise progress", "msel"),
                    ("View and respond to my injects", "respond"),
                    ("Record sustainment / improvement", "finding"),
                    ("Refresh", "refresh"),
                ],
            )

            if choice is None:
                return
            if choice == "brief":
                self.show_brief()
            elif choice == "msel":
                self.show_msel()
            elif choice == "respond":
                self.respond_to_inject()
            elif choice == "finding":
                self.record_finding()

    def patch_exercise(self, payload: dict[str, Any]) -> None:
        self.exercise = self.client.patch(
            f"exercises/{self.exercise_id}/",
            payload,
        )

    def control_exercise(self) -> None:
        self.refresh()
        choice = prompt_choice(
            "Exercise Control",
            [
                ("Mark prepared", {"status": "prepared"}),
                (
                    "Start exercise now",
                    {"status": "in_progress", "started_at": now_iso()},
                ),
                (
                    "Complete exercise now",
                    {"status": "completed", "ended_at": now_iso()},
                ),
            ],
        )
        if choice is None:
            return

        self.patch_exercise(choice)
        print("\nExercise updated.")
        pause()

    def event_control(self) -> None:
        self.refresh()
        events = sorted(self.exercise.get("events", []), key=lambda e: e["number"])
        if not events:
            print("\nNo events exist.")
            pause()
            return

        event = prompt_choice(
            "Select Event",
            [
                (
                    f"{e['number']} - {e['description']} ",
                    f"[{'ENDED' if e.get('ended_at') else 'ACTIVE' if e.get('started_at') else 'PENDING'}]",
                    e,
                )
                for e in events
            ],
        )
        if event is None:
            return

        action = prompt_choice(
            f"Event {event['number']} Control",
            [
                ("Start event now", {"started_at": now_iso()}),
                ("End event now", {"ended_at": now_iso()}),
            ],
        )
        if action is None:
            return

        self.client.patch(
            f"exercises/{self.exercise_id}/events/{event['id']}/",
            action,
        )
        self.refresh()
        print("\nEvent updated.")
        pause()

    def inject_control(self) -> None:
        self.refresh()
        injects = []
        for event in self.exercise.get("events", []):
            for inject in event.get("injects", []):
                injects.append((event, inject))

        if not injects:
            print("\nNo injects exist.")
            pause()
            return

        selected = prompt_choice(
            "Select Inject",
            [
                (
                    f"{i['number']} - Event {e['number']} - ",
                    f"{i['sender']} -> ",
                    f"{i['recipient']['first_name']} {i['recipient']['last_name']} ",
                    f"[{'CLOSED' if i.get('ended_at') else 'DELIVERED' if i.get('started_at') else 'QUEUED'}]",
                    (e, i),
                )
                for e, i in injects
            ],
        )
        if selected is None:
            return

        event, inject = selected
        self.header()
        print(f"\nINJECT {inject['number']}")
        print(rule())
        print(
            f"{inject['sender']} -> "
            f"{inject['recipient']['first_name']} {inject['recipient']['last_name']}"
        )
        print(f"Delivery Method: {inject['delivery_method']}")
        print(f"Scheduled      : {fmt_time(inject['scheduled_start_time'])}")
        print("\nMESSAGE")
        print(wrap(inject["message"]))
        print("\nEXPECTED RESPONSE")
        print(wrap(inject.get("expected_response") or "—"))

        if inject.get("responses"):
            print("\nRESPONSES")
            for response in inject["responses"]:
                p = response["participant"]
                print(f"- {p['first_name']} {p['last_name']}: {response['text']}")

        action = prompt_choice(
            "Inject Control",
            [
                ("Deliver inject now", {"started_at": now_iso()}),
                ("Close inject now", {"ended_at": now_iso()}),
            ],
        )
        if action is None:
            return

        self.client.patch(
            (
                f"exercises/{self.exercise_id}/events/{event['id']}/"
                f"injects/{inject['id']}/"
            ),
            action,
        )
        self.refresh()
        print("\nInject updated.")
        pause()

    def show_findings(self) -> None:
        self.refresh()
        self.header()
        print("\nFINDINGS")
        print(rule())

        findings = self.exercise.get("findings", [])
        if not findings:
            print("No findings.")
        else:
            for finding in findings:
                print(f"\n[{finding['type'].upper()}] {finding['topic']}")
                print(f"Observation    : {finding['observation']}")
                print(f"Recommendation : {finding['recommendation']}")

        pause()

    def show_aar(self) -> None:
        self.header()
        print("\nAFTER ACTION REPORT")
        print(rule())
        aar = self.client.get(f"exercises/{self.exercise_id}/after-action-report/")
        print(json.dumps(aar, indent=2))
        pause()

    def facilitator_menu(self) -> None:
        while True:
            self.refresh()
            self.header()

            choice = prompt_choice(
                "Facilitator Actions",
                [
                    ("View exercise brief", "brief"),
                    ("View live MSEL", "msel"),
                    ("Control exercise state", "exercise"),
                    ("Start / end an event", "event"),
                    ("Deliver / close an inject", "inject"),
                    ("View findings", "findings"),
                    ("Record sustainment / improvement", "finding"),
                    ("Fetch After Action Report", "aar"),
                    ("Refresh", "refresh"),
                ],
            )

            if choice is None:
                return
            if choice == "brief":
                self.show_brief()
            elif choice == "msel":
                self.show_msel()
            elif choice == "exercise":
                self.control_exercise()
            elif choice == "event":
                self.event_control()
            elif choice == "inject":
                self.inject_control()
            elif choice == "findings":
                self.show_findings()
            elif choice == "finding":
                self.record_finding()
            elif choice == "aar":
                self.show_aar()

    def run(self) -> None:
        if not self.select_exercise():
            return

        while True:
            self.refresh()
            if not self.select_role():
                continue

            if self.role == ROLE_FACILITATOR:
                self.facilitator_menu()
            else:
                self.participant_menu()

            again = prompt_choice(
                "Continue Testing",
                [
                    ("Switch persona", "switch"),
                    ("Select another exercise", "exercise"),
                    ("Exit", "exit"),
                ],
                allow_back=False,
            )

            if again == "exit":
                return
            if (again == "exercise") and (not self.select_exercise()):
                return


def main() -> int:
    clear()
    print("KAIJU // INTERACTIVE TTX CLIENT")
    print(rule("═"))
    print("Authenticating with the kaiju-bot Keycloak service account.")
    print()

    api_url = input(f"Kaiju API URL [{DEFAULT_API_URL}]: ").strip() or DEFAULT_API_URL
    keycloak_url = (
        input(f"Keycloak URL [{DEFAULT_KEYCLOAK_URL}]: ").strip()
        or DEFAULT_KEYCLOAK_URL
    )
    realm = (
        input(f"Keycloak Realm [{DEFAULT_KEYCLOAK_REALM}]: ").strip()
        or DEFAULT_KEYCLOAK_REALM
    )
    client_id = (
        input(f"Client ID [{DEFAULT_KEYCLOAK_CLIENT_ID}]: ").strip()
        or DEFAULT_KEYCLOAK_CLIENT_ID
    )

    secret = get_client_secret(client_id)

    client = KaijuClient(
        api_url=api_url,
        keycloak_url=keycloak_url,
        realm=realm,
        client_id=client_id,
        client_secret=secret,
    )

    print("\nRequesting JWT from Keycloak...")
    try:
        client.authenticate()
        client.get("health/")
    except RuntimeError as exc:
        print(f"\nERROR\n{exc}")
        return 1

    print("Authenticated. Kaiju API is reachable.")
    pause()

    app = KaijuTTX(client)
    app.run()
    print("\nGoodbye.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\n\nInterrupted.")
        raise SystemExit(130)
