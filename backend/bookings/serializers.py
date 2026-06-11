from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import Booking, Payment
from courts.serializers import CourtSerializer


class BookingSerializer(serializers.ModelSerializer):
    total_paid_amount = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()
    payment_progress_status = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "court",
            "member",
            "start_time",
            "end_time",
            "players_count",
            "fee_amount",
            "is_paid",
            "paid_at",
            "status",
            "attended",
            "no_show",
            "total_paid_amount",
            "balance_due",
            "payment_progress_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        start_time = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end_time = attrs.get("end_time", getattr(self.instance, "end_time", None))
        is_paid = attrs.get("is_paid", getattr(self.instance, "is_paid", False))
        paid_at = attrs.get("paid_at", getattr(self.instance, "paid_at", None))

        if is_paid and paid_at is None:
            raise serializers.ValidationError("paid_at is required when is_paid is true")

        data = {
            "court": attrs.get("court", getattr(self.instance, "court", None)),
            "member": attrs.get("member", getattr(self.instance, "member", None)),
            "start_time": start_time,
            "end_time": end_time,
            "players_count": attrs.get("players_count", getattr(self.instance, "players_count", None)),
            "fee_amount": attrs.get("fee_amount", getattr(self.instance, "fee_amount", 0)),
            "is_paid": is_paid,
            "paid_at": paid_at,
            "status": attrs.get("status", getattr(self.instance, "status", Booking.STATUS_CONFIRMED)),
            "attended": attrs.get("attended", getattr(self.instance, "attended", False)),
            "no_show": attrs.get("no_show", getattr(self.instance, "no_show", False)),
        }
        candidate = Booking(**data)
        if self.instance:
            candidate.pk = self.instance.pk

        try:
            # Use model.clean() for domain rules; full_clean() on an unsaved
            # candidate can incorrectly raise duplicate PK errors on updates.
            candidate.clean()
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise serializers.ValidationError(exc.message_dict)
            raise serializers.ValidationError(exc.messages)

        return attrs

    def get_total_paid_amount(self, obj):
        return obj.compute_total_paid_amount()

    def get_balance_due(self, obj):
        return obj.compute_balance_due()

    def get_payment_progress_status(self, obj):
        return obj.compute_payment_progress_status()


class BookingTimelineSerializer(serializers.ModelSerializer):
    """Serializer for member timeline/profile view with nested court info."""
    court = CourtSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "court",
            "start_time",
            "end_time",
            "players_count",
            "fee_amount",
            "is_paid",
            "paid_at",
            "status",
            "attended",
            "no_show",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "court",
            "start_time",
            "end_time",
            "players_count",
            "fee_amount",
            "is_paid",
            "paid_at",
            "status",
            "attended",
            "no_show",
            "created_at",
        ]


class PaymentSerializer(serializers.ModelSerializer):
    paid_by_username = serializers.CharField(source="paid_by.username", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "booking",
            "method",
            "reference",
            "amount",
            "status",
            "paid_by",
            "paid_by_username",
            "payment_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "paid_by", "paid_by_username"]

    def validate(self, attrs):
        data = {
            "booking": attrs.get("booking", getattr(self.instance, "booking", None)),
            "method": attrs.get("method", getattr(self.instance, "method", None)),
            "reference": attrs.get("reference", getattr(self.instance, "reference", "")),
            "amount": attrs.get("amount", getattr(self.instance, "amount", None)),
            "status": attrs.get("status", getattr(self.instance, "status", Payment.STATUS_UNPAID)),
            "payment_date": attrs.get("payment_date", getattr(self.instance, "payment_date", None)),
            "paid_by": attrs.get("paid_by", getattr(self.instance, "paid_by", None)),
        }

        candidate = Payment(**data)
        if self.instance:
            candidate.pk = self.instance.pk

        try:
            candidate.clean()
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise serializers.ValidationError(exc.message_dict)
            raise serializers.ValidationError(exc.messages)

        return attrs
