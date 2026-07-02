package app.simplefasting.widget

import android.content.Context
import kotlin.math.roundToInt

data class NativeFastingWidgetSnapshot(
  val status: String,
  val headline: String,
  val subtitle: String,
  val startedAt: Long,
  val goalEndsAt: Long,
  val hasGoal: Boolean,
  val hasReachedGoal: Boolean,
  val progress: Int,
  val timerView: String,
  val lightAccent: Int,
  val darkAccent: Int,
  val lightBackground: Int,
  val darkBackground: Int,
  val lightPrimary: Int,
  val darkPrimary: Int,
  val lightSecondary: Int,
  val darkSecondary: Int,
)

object NativeFastingWidgetState {
  private const val preferencesName = "native_fasting_widget"

  fun save(context: Context, state: Map<String, Any?>) {
    val editor = context.getSharedPreferences(preferencesName, Context.MODE_PRIVATE).edit()
    editor.putString("status", state.string("status", "inactive"))
    editor.putString("headline", state.string("headline", "Ready to fast"))
    editor.putString("subtitle", state.string("subtitle", "Tap to start"))
    editor.putLong("startedAt", state.long("startedAt", 0L))
    editor.putLong("goalEndsAt", state.long("goalEndsAt", 0L))
    editor.putBoolean("hasGoal", state.boolean("hasGoal", false))
    editor.putBoolean("hasReachedGoal", state.boolean("hasReachedGoal", false))
    editor.putInt("progress", (state.double("progress", 0.0).coerceIn(0.0, 1.0) * 1000).roundToInt())
    editor.putString("timerView", state.string("timerView", "elapsed"))
    editor.putInt("lightAccent", state.color("lightAccent", 0xFFF59E0B.toInt()))
    editor.putInt("darkAccent", state.color("darkAccent", 0xFFD97706.toInt()))
    editor.putInt("lightBackground", state.color("lightBackground", 0xFFF7F8FC.toInt()))
    editor.putInt("darkBackground", state.color("darkBackground", 0xFF15171C.toInt()))
    editor.putInt("lightPrimary", state.color("lightPrimary", 0xFF17191F.toInt()))
    editor.putInt("darkPrimary", state.color("darkPrimary", 0xFFF5F7FF.toInt()))
    editor.putInt("lightSecondary", state.color("lightSecondary", 0xFF626979.toInt()))
    editor.putInt("darkSecondary", state.color("darkSecondary", 0xFFA9AFBD.toInt()))
    editor.apply()
  }

  fun clear(context: Context) {
    context.getSharedPreferences(preferencesName, Context.MODE_PRIVATE).edit().clear().apply()
  }

  fun read(context: Context): NativeFastingWidgetSnapshot {
    val preferences = context.getSharedPreferences(preferencesName, Context.MODE_PRIVATE)
    return NativeFastingWidgetSnapshot(
      status = preferences.getString("status", "inactive") ?: "inactive",
      headline = preferences.getString("headline", "Ready to fast") ?: "Ready to fast",
      subtitle = preferences.getString("subtitle", "Tap to start") ?: "Tap to start",
      startedAt = preferences.getLong("startedAt", 0L),
      goalEndsAt = preferences.getLong("goalEndsAt", 0L),
      hasGoal = preferences.getBoolean("hasGoal", false),
      hasReachedGoal = preferences.getBoolean("hasReachedGoal", false),
      progress = preferences.getInt("progress", 0).coerceIn(0, 1000),
      timerView = preferences.getString("timerView", "elapsed") ?: "elapsed",
      lightAccent = preferences.getInt("lightAccent", 0xFFF59E0B.toInt()),
      darkAccent = preferences.getInt("darkAccent", 0xFFD97706.toInt()),
      lightBackground = preferences.getInt("lightBackground", 0xFFF7F8FC.toInt()),
      darkBackground = preferences.getInt("darkBackground", 0xFF15171C.toInt()),
      lightPrimary = preferences.getInt("lightPrimary", 0xFF17191F.toInt()),
      darkPrimary = preferences.getInt("darkPrimary", 0xFFF5F7FF.toInt()),
      lightSecondary = preferences.getInt("lightSecondary", 0xFF626979.toInt()),
      darkSecondary = preferences.getInt("darkSecondary", 0xFFA9AFBD.toInt()),
    )
  }

  private fun Map<String, Any?>.string(name: String, fallback: String): String {
    return this[name] as? String ?: fallback
  }

  private fun Map<String, Any?>.boolean(name: String, fallback: Boolean): Boolean {
    return this[name] as? Boolean ?: fallback
  }

  private fun Map<String, Any?>.double(name: String, fallback: Double): Double {
    return (this[name] as? Number)?.toDouble() ?: fallback
  }

  private fun Map<String, Any?>.long(name: String, fallback: Long): Long {
    return double(name, fallback.toDouble()).toLong()
  }

  private fun Map<String, Any?>.color(name: String, fallback: Int): Int {
    val value = string(name, "")
    if (!value.matches(Regex("^#[0-9A-Fa-f]{6}$"))) {
      return fallback
    }
    return (0xFF000000L or value.substring(1).toLong(16)).toInt()
  }
}
