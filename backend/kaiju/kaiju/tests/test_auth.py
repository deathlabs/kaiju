# Standard library imports.
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory

# Third party imports.
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from jwt import encode


class AuthenticationTests(TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        super().setUpClass()
        cls.temporary_directory = TemporaryDirectory()
        cls.private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        public_key = cls.private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        cls.public_key_path = Path(cls.temporary_directory.name) / "public-key.pem"
        cls.public_key_path.write_bytes(public_key)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temporary_directory.cleanup()
        super().tearDownClass()

    def _token(
        self,
        *,
        private_key=None,
        issuer: str = "https://kaiju.local/realms/development",
        audience: str = "kaiju",
        expires_at: datetime | None = None,
    ) -> str:
        now = datetime.now(UTC)
        return encode(
            {
                "iss": issuer,
                "aud": audience,
                "sub": "00000000-0000-0000-0000-000000000001",
                "iat": now,
                "exp": expires_at or now + timedelta(minutes=10),
                "preferred_username": "Vic Fernandez III",
                "given_name": "Vic",
                "family_name": "Fernandez III",
                "email": "victor@deathlabs.io",
            },
            private_key or self.private_key,
            algorithm="RS256",
            headers={"kid": "kaiju-test"},
        )

    def _authorization(self, token: str) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    def _settings(self):
        return override_settings(
            AUTH_MODE="local",
            OIDC_ISSUER="https://kaiju.local/realms/development",
            OIDC_AUDIENCE="kaiju",
            OIDC_PUBLIC_KEY_PATH=str(self.public_key_path),
        )

    def test_current_user_returns_validated_local_user(self):
        with self._settings():
            response = self.client.get(
                "/api/v1/me",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["display_name"], "Vic Fernandez III")
        self.assertEqual(response.json()["username"], "Vic Fernandez III")
        self.assertEqual(response.json()["email"], "victor@deathlabs.io")

    def test_missing_token_is_rejected(self):
        with self._settings():
            response = self.client.get("/api/v1/me")

        self.assertEqual(response.status_code, 401)

    def test_expired_token_is_rejected(self):
        token = self._token(expires_at=datetime.now(UTC) - timedelta(seconds=1))

        with self._settings():
            response = self.client.get(
                "/api/v1/me",
                **self._authorization(token),
            )

        self.assertEqual(response.status_code, 401)

    def test_wrong_audience_is_rejected(self):
        with self._settings():
            response = self.client.get(
                "/api/v1/me",
                **self._authorization(self._token(audience="another-application")),
            )

        self.assertEqual(response.status_code, 401)

    def test_wrong_issuer_is_rejected(self):
        with self._settings():
            response = self.client.get(
                "/api/v1/me",
                **self._authorization(self._token(issuer="https://example.mil")),
            )

        self.assertEqual(response.status_code, 401)

    def test_invalid_signature_is_rejected(self):
        other_private_key = rsa.generate_private_key(
            public_exponent=65537, key_size=2048
        )

        with self._settings():
            response = self.client.get(
                "/api/v1/me",
                **self._authorization(self._token(private_key=other_private_key)),
            )

        self.assertEqual(response.status_code, 401)

    def test_validated_user_can_create_exercise(self):
        with self._settings():
            response = self.client.post(
                "/api/v1/exercises/",
                data=json.dumps(
                    {
                        "title": "Incident response exercise",
                        "type": "discussion",
                        "scheduled_start_time": "2026-11-16T13:00:00Z",
                        "scheduled_end_time": "2026-11-16T15:00:00Z",
                        "scenario": "Unknown outbound traffic was observed.",
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 201)
        user = get_user_model().objects.get(username="Vic Fernandez III")
        self.assertEqual(user.exercises_created.count(), 1)

    def test_health_endpoint_does_not_require_token(self):
        response = self.client.get("/api/v1/health/")

        self.assertEqual(response.status_code, 200)
