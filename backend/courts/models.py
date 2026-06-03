from django.db import models


class Court(models.Model):
    STATUS_AVAILABLE = "available"
    STATUS_BOOKED = "booked"
    STATUS_MAINTENANCE = "maintenance"
    STATUS_CHOICES = [
        (STATUS_AVAILABLE, "Available"),
        (STATUS_BOOKED, "Booked"),
        (STATUS_MAINTENANCE, "Maintenance"),
    ]

    name = models.CharField(max_length=50, unique=True)
    max_players = models.PositiveIntegerField(default=4)
    operating_open_time = models.TimeField(default="06:00")
    operating_close_time = models.TimeField(default="22:00")
    blackout_dates = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_AVAILABLE,
    )
    is_indoor = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name