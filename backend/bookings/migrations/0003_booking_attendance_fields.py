# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_booking_fee_amount_booking_is_paid_booking_paid_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='attended',
            field=models.BooleanField(default=False, help_text='Whether member attended this booking'),
        ),
        migrations.AddField(
            model_name='booking',
            name='no_show',
            field=models.BooleanField(default=False, help_text='Whether member was a no-show'),
        ),
    ]
