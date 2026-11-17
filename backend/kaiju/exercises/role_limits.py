"""Participant limits for each exercise role."""

from exercises.models import Participant

ROLE_LIMITS = {
    Participant.Role.FACILITATOR: 3,
    Participant.Role.ISO: 1,
    Participant.Role.ISSM: 1,
    Participant.Role.ISSO: 4,
    Participant.Role.SYSTEM_ADMINISTRATOR: 4,
    Participant.Role.USER: 10,
    Participant.Role.CSSP: 2,
}
