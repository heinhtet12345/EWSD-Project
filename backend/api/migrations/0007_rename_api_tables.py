from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_alter_department_dept_name"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="department",
            table="Department",
        ),
        migrations.AlterModelTable(
            name="role",
            table="Role",
        ),
        migrations.AlterModelTable(
            name="user",
            table="User",
        ),
        migrations.AlterModelTable(
            name="category",
            table="Category",
        ),
        migrations.AlterModelTable(
            name="notification",
            table="Notification",
        ),
    ]
