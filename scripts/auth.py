# Standard library imports.
from argparse import ArgumentParser, Namespace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from shlex import quote
from sys import path as module_path
from uuid import NAMESPACE_URL, uuid5

# Third party imports.
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt import encode

# Constants.
ROLE_NAMES = {
    "FACILITATOR": "facilitator",
    "ISO": "information_system_owner",
    "ISSM": "information_system_security_manager",
    "ISSO": "information_system_security_officer",
    "SYSTEM_ADMINISTRATOR": "system_administrator",
    "USER": "user",
    "CSSP": "cybersecurity_service_provider",
    "OPFOR": "opposing_force",
}


def parse_args() -> Namespace:
    parser = ArgumentParser(description="Create local Kaiju authentication files.")
    parser.add_argument("--issuer", required=True)
    parser.add_argument("--audience", required=True)
    parser.add_argument("--username", default="Vic Fernandez III")
    parser.add_argument("--given-name", default="Vic")
    parser.add_argument("--family-name", default="Fernandez III")
    parser.add_argument("--email", default="victor@deathlabs.io")
    parser.add_argument("--lifetime-hours", default=12, type=int)
    parser.add_argument("--multiple", action="store_true")
    return parser.parse_args()


def write_environment_file(path: Path, values: dict[str, str]) -> None:
    content = "".join(
        f"export {name}={quote(value)}\n" for name, value in values.items()
    )
    path.write_text(content, encoding="ascii")
    path.chmod(0o600)


def main() -> None:
    args = parse_args()
    if args.lifetime_hours < 1:
        raise ValueError("--lifetime-hours must be at least 1")

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    public_key_path = Path.cwd() / "public-key.pem"
    public_key_path.write_bytes(public_key)
    public_key_path.chmod(0o600)

    now = datetime.now(UTC)
    identities = {"AUTH_TOKEN": (args.username, args.given_name, args.family_name, args.email)}
    if args.multiple:
        module_path.insert(0, str(Path(__file__).resolve().parent.parent / "backend" / "kaiju"))
        from seed_data import PARTICIPANTS

        identities = {}
        for label, role in ROLE_NAMES.items():
            first, last, _ = next(person for person in PARTICIPANTS if person[2] == role)
            identities[f"AUTH_TOKEN_{label}"] = (
                f"{first} {last}", first, last, args.email if label == "ISSM" else f"{first}.{last}@deathlabs.io".lower(),
            )

    values = {
        "AUTH_MODE": "local",
        "OIDC_ISSUER": args.issuer,
        "OIDC_AUDIENCE": args.audience,
        "OIDC_PUBLIC_KEY_PATH": str(public_key_path.resolve()),
    }
    for name, (username, first, last, email) in identities.items():
        values[name] = encode(
            {
                "iss": args.issuer,
                "aud": args.audience,
                "sub": str(uuid5(NAMESPACE_URL, f"{args.issuer}/{username}")),
                "iat": now,
                "exp": now + timedelta(hours=args.lifetime_hours),
                "preferred_username": username,
                "given_name": first,
                "family_name": last,
                "email": email,
            },
            private_key,
            algorithm="RS256",
            headers={"kid": "kaiju-development"},
        )

    environment_path = Path.cwd() / ".env"
    write_environment_file(environment_path, values)
    print(environment_path)


if __name__ == "__main__":
    main()
