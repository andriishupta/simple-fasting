package app.simplefasting.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews

class NativeFastingWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    for (appWidgetId in appWidgetIds) {
      updateWidget(context, appWidgetManager, appWidgetId, R.layout.native_fasting_widget)
    }
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == NativeFastingWidgetScheduler.actionGoalReached) {
      updateAll(context)
    }
  }

  companion object {
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      updateProvider(
        context,
        manager,
        NativeFastingWidgetProvider::class.java,
        R.layout.native_fasting_widget,
      )
      updateProvider(
        context,
        manager,
        NativeFastingWideWidgetProvider::class.java,
        R.layout.native_fasting_widget_wide,
      )
    }

    private fun updateProvider(
      context: Context,
      manager: AppWidgetManager,
      providerClass: Class<out AppWidgetProvider>,
      layoutId: Int,
    ) {
      val ids = manager.getAppWidgetIds(ComponentName(context, providerClass))
      for (id in ids) {
        updateWidget(context, manager, id, layoutId)
      }
    }

    internal fun updateWidget(
      context: Context,
      manager: AppWidgetManager,
      appWidgetId: Int,
      layoutId: Int,
    ) {
      val snapshot = NativeFastingWidgetState.read(context)
      val views = RemoteViews(context.packageName, layoutId)
      val colors = WidgetColors.from(context, snapshot)
      val isActive = snapshot.status == "active" && snapshot.startedAt > 0L

      views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context))
      views.setInt(R.id.widget_root, "setBackgroundColor", colors.background)
      views.setTextColor(R.id.widget_brand, colors.accent)
      views.setTextColor(R.id.widget_headline, colors.primary)
      views.setTextColor(R.id.widget_mode, colors.accent)
      views.setTextColor(R.id.widget_timer, colors.accent)
      views.setTextColor(R.id.widget_goal_check, colors.accent)
      views.setTextColor(R.id.widget_ready_headline, colors.primary)
      views.setTextColor(R.id.widget_ready_subtitle, colors.secondary)

      views.setViewVisibility(R.id.widget_active_group, if (isActive) View.VISIBLE else View.GONE)
      views.setViewVisibility(R.id.widget_ready_group, if (isActive) View.GONE else View.VISIBLE)
      views.setViewVisibility(R.id.widget_timer, if (isActive) View.VISIBLE else View.GONE)

      if (isActive) {
        val showsRemaining = snapshot.timerView == "remaining" && snapshot.hasGoal && !snapshot.hasReachedGoal
        val timerBase = if (showsRemaining) {
          wallClockToElapsedRealtime(snapshot.goalEndsAt)
        } else {
          wallClockToElapsedRealtime(snapshot.startedAt)
        }

        views.setTextViewText(R.id.widget_headline, snapshot.headline)
        views.setTextViewText(R.id.widget_mode, if (showsRemaining) "REMAINING" else "ELAPSED")
        views.setChronometer(R.id.widget_timer, timerBase, null, true)
        views.setChronometerCountDown(R.id.widget_timer, showsRemaining)
        views.setViewVisibility(R.id.widget_goal_check, if (snapshot.hasReachedGoal) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.widget_progress, if (snapshot.hasGoal) View.VISIBLE else View.GONE)
        views.setProgressBar(R.id.widget_progress, 1000, snapshot.progress, false)
      } else {
        views.setTextViewText(R.id.widget_ready_headline, snapshot.headline)
        views.setTextViewText(R.id.widget_ready_subtitle, snapshot.subtitle)
        views.setChronometer(R.id.widget_timer, SystemClock.elapsedRealtime(), null, false)
        views.setChronometerCountDown(R.id.widget_timer, false)
      }

      manager.updateAppWidget(appWidgetId, views)
    }

    private fun wallClockToElapsedRealtime(wallClockMillis: Long): Long {
      return SystemClock.elapsedRealtime() + (wallClockMillis - System.currentTimeMillis())
    }

    private fun openAppIntent(context: Context): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("simple-fasting://")).apply {
        setPackage(context.packageName)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      return PendingIntent.getActivity(context, 0, intent, flags)
    }
  }
}

class NativeFastingWideWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    for (appWidgetId in appWidgetIds) {
      NativeFastingWidgetProvider.updateWidget(
        context,
        appWidgetManager,
        appWidgetId,
        R.layout.native_fasting_widget_wide,
      )
    }
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == NativeFastingWidgetScheduler.actionGoalReached) {
      NativeFastingWidgetProvider.updateAll(context)
    }
  }
}

private data class WidgetColors(
  val accent: Int,
  val background: Int,
  val primary: Int,
  val secondary: Int,
) {
  companion object {
    fun from(context: Context, snapshot: NativeFastingWidgetSnapshot): WidgetColors {
      val nightMode = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
      val isDark = nightMode == Configuration.UI_MODE_NIGHT_YES
      return if (isDark) {
        WidgetColors(snapshot.darkAccent, snapshot.darkBackground, snapshot.darkPrimary, snapshot.darkSecondary)
      } else {
        WidgetColors(snapshot.lightAccent, snapshot.lightBackground, snapshot.lightPrimary, snapshot.lightSecondary)
      }
    }
  }
}
