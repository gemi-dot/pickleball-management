from decimal import Decimal

from django.db import migrations
from django.utils import timezone


def sync_booking_payment_flags(apps, schema_editor):
    Booking = apps.get_model("bookings", "Booking")
    Payment = apps.get_model("bookings", "Payment")

    paid_statuses = {"paid", "partial"}

    for booking in Booking.objects.all().iterator():
        total_paid = Decimal("0.00")
        for payment in Payment.objects.filter(booking_id=booking.id).only("status", "amount"):
            if payment.status in paid_statuses:
                total_paid += payment.amount
            elif payment.status == "refunded":
                total_paid -= payment.amount

        if total_paid < Decimal("0.00"):
            total_paid = Decimal("0.00")

        fee_amount = booking.fee_amount or Decimal("0.00")
        balance_due = fee_amount - total_paid
        if balance_due < Decimal("0.00"):
            balance_due = Decimal("0.00")

        should_be_paid = balance_due <= Decimal("0.00")
        paid_at = booking.paid_at
        if should_be_paid and paid_at is None:
            paid_at = timezone.now()
        if not should_be_paid:
            paid_at = None

        if booking.is_paid != should_be_paid or booking.paid_at != paid_at:
            booking.is_paid = should_be_paid
            booking.paid_at = paid_at
            booking.save(update_fields=["is_paid", "paid_at", "updated_at"])


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0005_payment_lifecycle_fields"),
    ]

    operations = [
        migrations.RunPython(sync_booking_payment_flags, migrations.RunPython.noop),
    ]
