package app.simplefasting.widget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeFastingWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeFastingWidget")

    Function("update") { state: Map<String, Any?> ->
      val context = appContext.reactContext ?: return@Function
      NativeFastingWidgetState.save(context, state)
      NativeFastingWidgetScheduler.scheduleActiveUpdates(context)
      NativeFastingWidgetProvider.updateAll(context)
    }

    Function("clear") {
      val context = appContext.reactContext ?: return@Function
      NativeFastingWidgetState.clear(context)
      NativeFastingWidgetScheduler.cancelActiveUpdates(context)
      NativeFastingWidgetProvider.updateAll(context)
    }
  }
}
