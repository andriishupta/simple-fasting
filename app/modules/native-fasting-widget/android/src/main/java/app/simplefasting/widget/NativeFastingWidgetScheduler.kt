package app.simplefasting.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent

object NativeFastingWidgetScheduler {
  const val actionGoalReached = "app.simplefasting.widget.GOAL_REACHED"
  private const val goalTransitionRequestCode = 1101

  fun scheduleGoalTransition(context: Context) {
    val snapshot = NativeFastingWidgetState.read(context)
    cancelGoalTransition(context)

    if (
      snapshot.status != "active" ||
      !snapshot.hasGoal ||
      snapshot.hasReachedGoal ||
      snapshot.goalEndsAt <= System.currentTimeMillis()
    ) {
      return
    }

    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.set(
      AlarmManager.RTC,
      snapshot.goalEndsAt,
      goalTransitionIntent(context),
    )
  }

  fun cancelGoalTransition(context: Context) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.cancel(goalTransitionIntent(context))
  }

  private fun goalTransitionIntent(context: Context): PendingIntent {
    val intent = Intent(context, NativeFastingWidgetProvider::class.java).apply {
      action = actionGoalReached
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(context, goalTransitionRequestCode, intent, flags)
  }
}
