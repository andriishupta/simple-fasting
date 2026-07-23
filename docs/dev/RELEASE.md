# Release Checklist

Короткий чекліст для першої тестової публікації Simple Fasting.

## Поточні ідентифікатори

- Version: `1.0.0`
- iOS build number: `1`
- iOS bundle ID: `app.simplefasting`
- Android version code: `1`
- Android package: `app.simplefasting`
- App Store name: `Simple Fasting: Fast Timer`
- Website: <https://simplefasting.app>

Запис застосунку вже створений окремо в App Store Connect і Google Play
Console. Expo-проєкт також уже підключений через EAS project ID.

Створення записів у магазинах не завантажує локальну збірку автоматично.
Потрібні EAS build і store upload.

## 1. Preflight

```bash
cd app
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm test:coverage
cd ..

cd www
pnpm test
cd ..
```

## 2. Перевірити Expo

```bash
cd app
eas whoami
eas project:info
```

## 3. Створити підписані store-збірки

```bash
eas build --platform all --profile production
```

Під час першої збірки:

- iOS: увійти в правильну Apple Developer Team і дозволити EAS створити
  distribution certificate та provisioning profiles для основного застосунку
  і widget;
- Android: вибрати `Generate new Android Keystore`;
- перевірити, що обидва ідентифікатори — `app.simplefasting`.

## 4. Завантажити iOS у TestFlight

```bash
eas submit --platform ios --latest
```

Після обробки збірки:

1. Відкрити App Store Connect → Simple Fasting → TestFlight.
2. Створити групу `Internal Testing`.
3. Додати збірку і свій App Store Connect account.
4. Встановити TestFlight на iPhone та прийняти запрошення.

Для internal testing окремий Beta App Review не потрібен. Обробка збірки
зазвичай займає приблизно 10–15 хвилин, але інколи довше.

## 5. Завантажити Android в Internal Testing

Для першої збірки найпростіше завантажити її вручну:

1. Завантажити `.aab` з EAS build page.
2. Відкрити Google Play Console → Simple Fasting.
3. Перейти до Test and release → Internal testing.
4. Створити release і завантажити `.aab`.
5. Додати Gmail-акаунти тестувальників.
6. Натиснути Roll out/Publish to internal testing.
7. Відкрити opt-in link на Android-телефоні та встановити застосунок.

Перша Android-збірка може оброблятися кілька годин.

## 6. Перевірити store-збірки

- iOS встановлюється через TestFlight.
- Android встановлюється через Google Play Internal Testing.
- Timer, notifications, history, statistics і widgets працюють у store builds.
- Privacy Policy, Terms, FAQ і support links відкривають
  <https://simplefasting.app>.

Не запускати production release, доки обидві тестові store-збірки не перевірені
на фізичних телефонах.

> Для нових персональних Google Play accounts production-доступ може вимагати
> closed test із щонайменше 12 тестувальниками протягом 14 днів. Це не заважає
> використовувати Internal Testing зараз.
