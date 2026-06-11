from rest_framework import serializers

from .models import Member


class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "membership_tier",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MemberDetailSerializer(serializers.ModelSerializer):
    """Extended serializer for member profile/detail view with stats."""
    bookings_count = serializers.SerializerMethodField()
    attended_count = serializers.SerializerMethodField()
    no_show_count = serializers.SerializerMethodField()
    total_fees = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    total_balance_due = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "membership_tier",
            "is_active",
            "bookings_count",
            "attended_count",
            "no_show_count",
            "total_fees",
            "total_paid",
            "total_balance_due",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "bookings_count",
            "attended_count",
            "no_show_count",
            "total_fees",
            "total_paid",
            "total_balance_due",
            "created_at",
            "updated_at",
        ]

    def get_bookings_count(self, obj):
        return obj.bookings.filter(status__in=["confirmed", "waitlist"]).count()

    def get_attended_count(self, obj):
        return obj.bookings.filter(attended=True).count()

    def get_no_show_count(self, obj):
        return obj.bookings.filter(no_show=True).count()

    def get_total_fees(self, obj):
        from django.db.models import Sum
        result = obj.bookings.filter(
            status="confirmed"
        ).aggregate(total=Sum("fee_amount"))
        return float(result["total"] or 0)

    def get_total_paid(self, obj):
        from django.db.models import Sum
        from bookings.models import Payment
        result = Payment.objects.filter(
            booking__member=obj,
            status__in=[Payment.STATUS_PAID, Payment.STATUS_PARTIAL],
        ).aggregate(total=Sum("amount"))
        return float(result["total"] or 0)

    def get_total_balance_due(self, obj):
        from django.db.models import Sum
        fees = obj.bookings.filter(status="confirmed").aggregate(
            total=Sum("fee_amount")
        )["total"] or 0
        from bookings.models import Payment
        paid = Payment.objects.filter(
            booking__member=obj,
            status__in=[Payment.STATUS_PAID, Payment.STATUS_PARTIAL],
        ).aggregate(total=Sum("amount"))["total"] or 0
        return max(float(fees) - float(paid), 0)
