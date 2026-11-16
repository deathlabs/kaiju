"""Exercise chat authorization, history, and change notifications."""

import asyncio
import json
import logging
import select
import threading
import time

import psycopg2
from asgiref.sync import sync_to_async
from django.conf import settings
from django.db import connection
from django.db.models import Q
from django.http import HttpResponse, StreamingHttpResponse
from jwt.exceptions import InvalidTokenError, PyJWKClientError

from exercises.models import ChatMessage, Participant
from kaiju.auth import authenticate_token

logger = logging.getLogger(__name__)
_subscribers = set()
_lock = threading.Lock()
_listener = None


def participant_for(user, exercise_id):
    """Find the user's participant record for an exercise."""
    identity = Q(user=user)
    if user.email:
        identity |= Q(user__isnull=True, email__iexact=user.email)
    return Participant.objects.filter(exercise_id=exercise_id).filter(identity).first()


def history(exercise_id):
    """Return current messages in a stable order."""
    return [
        {"id": str(message.id), "author_name": message.author_name,
         "created_at": message.created_at.isoformat(), "text": message.text}
        for message in ChatMessage.objects.filter(exercise_id=exercise_id).order_by("created_at", "id")
    ]


def notify(exercise_id):
    """Publish a change when the surrounding transaction commits."""
    if connection.vendor == "postgresql":
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_notify('kaiju_chat', %s)", [str(exercise_id)])


def _wake(exercise_id=None):
    with _lock:
        subscribers = list(_subscribers)
    for loop, event, subscribed_id in subscribers:
        if exercise_id is None or subscribed_id == exercise_id:
            try:
                loop.call_soon_threadsafe(event.set)
            except RuntimeError:
                pass


def _listen():
    while True:
        try:
            database = settings.DATABASES["default"]
            with psycopg2.connect(host=database["HOST"], port=database["PORT"],
                                  dbname=database["NAME"], user=database["USER"],
                                  password=database["PASSWORD"]) as database_connection:
                database_connection.set_session(autocommit=True)
                with database_connection.cursor() as cursor:
                    cursor.execute("LISTEN kaiju_chat")
                _wake()
                while True:
                    if select.select([database_connection], [], [], 30)[0]:
                        database_connection.poll()
                        while database_connection.notifies:
                            _wake(database_connection.notifies.pop(0).payload)
        except Exception:
            logger.exception("Chat listener disconnected")
            time.sleep(2)


def _subscribe(exercise_id):
    global _listener
    event = asyncio.Event()
    subscriber = (asyncio.get_running_loop(), event, str(exercise_id))
    with _lock:
        _subscribers.add(subscriber)
        if settings.DATABASES["default"]["ENGINE"].endswith("postgresql") and (_listener is None or not _listener.is_alive()):
            _listener = threading.Thread(target=_listen, daemon=True)
            _listener.start()
    return subscriber


def _authenticate(request, exercise_id):
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return None
    try:
        user = authenticate_token(authorization[7:])
    except (InvalidTokenError, OSError, PyJWKClientError, RuntimeError, ValueError):
        return None
    return user if participant_for(user, exercise_id) else None


async def stream(request, exercise_id):
    """Stream current chat history to an authorized participant."""
    user = await sync_to_async(_authenticate)(request, exercise_id)
    if user is None:
        return HttpResponse(status=403)

    async def events():
        subscriber = _subscribe(exercise_id)
        event = subscriber[1]
        try:
            while True:
                event.clear()
                # Revalidate both the token and exercise membership on every refresh.
                if await sync_to_async(_authenticate)(request, exercise_id) is None:
                    break
                messages = await sync_to_async(history)(exercise_id)
                yield f"data: {json.dumps(messages)}\n\n"
                try:
                    await asyncio.wait_for(event.wait(), timeout=15)
                except TimeoutError:
                    pass
        finally:
            with _lock:
                _subscribers.discard(subscriber)

    response = StreamingHttpResponse(events(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache, no-transform"
    response["X-Accel-Buffering"] = "no"
    return response
