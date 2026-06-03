from rest_framework import serializers

from .models import Court


class CourtSerializer(serializers.ModelSerializer):
    class Meta:
        model = Court
        fields = [
            "id",
            "name",
            "max_players",
            "operating_open_time",
            "operating_close_time",
            "blackout_dates",
            "status",
            "is_indoor",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
