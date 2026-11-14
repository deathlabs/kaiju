# Standard library imports.
from argparse import ArgumentParser, Namespace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from shlex import quote

# Third party imports.
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt import encode


def parse_args() -> Namespace:
    parser = ArgumentParser(description="Create local Kaiju authentication files.")
    parser.add_argument("--issuer", required=True)
    parser.add_argument("--audience", required=True)
    parser.add_argument("--username", default="Vic Fernandez III")
    parser.add_argument("--given-name", default="Vic")
    parser.add_argument("--family-name", default="Fernandez III")
    parser.add_argument("--email", default="victor@deathlabs.io")
    parser.add_argument("--lifetime-hours", default=12, type=int)
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
    token = encode(
        {
            "iss": args.issuer,
            "aud": args.audience,
            "sub": "00000000-0000-0000-0000-000000000001",
            "iat": now,
            "exp": now + timedelta(hours=args.lifetime_hours),
            "preferred_username": args.username,
            "given_name": args.given_name,
            "family_name": args.family_name,
            "email": args.email,
        },
        private_key,
        algorithm="RS256",
        headers={"kid": "kaiju-development"},
    )

    environment_path = Path.cwd() / ".env"
    write_environment_file(
        environment_path,
        {
            "AUTH_MODE": "local",
            "OIDC_ISSUER": args.issuer,
            "OIDC_AUDIENCE": args.audience,
            "OIDC_PUBLIC_KEY_PATH": str(public_key_path.resolve()),
            "AUTH_TOKEN": token,
        },
    )
    print(environment_path)


if __name__ == "__main__":
    main()
