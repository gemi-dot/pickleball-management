from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0003_booking_attendance_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "method",
                    models.CharField(
                        choices=[
                            ("cash", "Cash"),
                            ("bank_transfer", "Bank Transfer"),
                            ("ewallet", "E-Wallet"),
                            ("card", "Card"),
                        ],
                        max_length=20,
                    ),
                ),
                ("reference", models.CharField(blank=True, default="", max_length=120)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                            ("refunded", "Refunded"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "booking",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="payments", to="bookings.booking"),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
