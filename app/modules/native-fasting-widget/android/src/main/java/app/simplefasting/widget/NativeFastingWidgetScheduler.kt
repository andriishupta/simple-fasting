package app.simplefasting.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

object NativeFastingWidgetScheduler {
  const val actionGoalReached = "app.simplefasting.widget.GOAL_REACHED"
  const val actionProgressTick = "app.simplefasting.widget.PROGRESS_TICK"
  private const val goalTransitionRequestCode = 1101
  private const val progressTickRequestCode = 1102
  private const val progressTickIntervalMillis = 15 * 60 * 1000L

  fun scheduleActiveUpdates(context: Context) {
    val snapshot = NativeFastingWidgetState.read(context)
    cancelActiveUpdates(context)

    if (
      snapshot.status != "active" ||
      !snapshot.hasGoal ||
      snapshot.goalEndsAt <= System.currentTimeMillis() ||
      !hasInstalledWidgets(context)
    ) {
      return
    }

    scheduleGoalTransition(context, snapshot.goalEndsAt)
    scheduleProgressTick(context, snapshot.goalEndsAt)
  }

  fun cancelActiveUpdates(context: Context) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.cancel(goalTransitionIntent(context))
    alarmManager.cancel(progressTickIntent(context))
  }

  private fun scheduleGoalTransition(context: Context, goalEndsAt: Long) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.set(
      AlarmManager.RTC,
      goalEndsAt,
      goalTransitionIntent(context),
    )
  }

  private fun scheduleProgressTick(context: Context, goalEndsAt: Long) {
    val nextTickAt = (System.currentTimeMillis() + progressTickIntervalMillis)
      .coerceAtMost(goalEndsAt)

    if (nextTickAt >= goalEndsAt) {
      return
    }

    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.set(
      AlarmManager.RTC,
      nextTickAt,
      progressTickIntent(context),
    )
  }

  private fun goalTransitionIntent(context: Context): PendingIntent {
    val intent = Intent(context, NativeFastingWidgetProvider::class.java).apply {
      action = actionGoalReached
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(context, goalTransitionRequestCode, intent, flags)
  }

  private fun progressTickIntent(context: Context): PendingIntent {
    val intent = Intent(context, NativeFastingWidgetProvider::class.java).apply {
      action = actionProgressTick
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(context, progressTickRequestCode, intent, flags)
  }

  private fun hasInstalledWidgets(context: Context): Boolean {
    val manager = AppWidgetManager.getInstance(context)
    val compactIds = manager.getAppWidgetIds(
      ComponentName(context, NativeFastingWidgetProvider::class.java),
    )
    val wideIds = manager.getAppWidgetIds(
      ComponentName(context, NativeFastingWideWidgetProvider::class.java),
    )
    return compactIds.isNotEmpty() || wideIds.isNotEmpty()
  }
}
