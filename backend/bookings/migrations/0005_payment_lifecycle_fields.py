from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def map_legacy_payment_statuses(apps, schema_editor):
    Payment = apps.get_model("bookings", "Payment")
    mapping = {
        "pending": "unpaid",
        "completed": "paid",
        "failed": "void",
    }
    for old_status, new_status in mapping.items():
        Payment.objects.filter(status=old_status).update(status=new_status)


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0004_payment"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="paid_by",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"is_staff": True},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="processed_payments",
                to="auth.user",
            ),
        ),
        migrations.AddField(
            model_name="payment",
            name="payment_date",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.RunPython(map_legacy_payment_statuses, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="payment",
            name="status",
            field=models.CharField(
                choices=[
                    ("unpaid", "Unpaid"),
                    ("partial", "Partial"),
                    ("paid", "Paid"),
                    ("refunded", "Refunded"),
                    ("void", "Void"),
                ],
                default="unpaid",
                max_length=20,
            ),
        ),
    ]
