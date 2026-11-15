# Demenova: farmer guide

Demenova warns you when water may waterlog or flood your banana lots. It runs on your phone, with no sensors.
Built with NASA Earth observations.

> **Important.** The checks in this guide are **general guidance, not yet reviewed by a local agronomist**.
> They are checks, not prescriptions: Demenova never recommends products or doses.
> Demenova supports the agronomist's judgment; it never replaces it.

## 1. Install the app

Demenova is a web page that installs like an app. No app store is needed.

**Android (Chrome)**
1. Open the Demenova link in Chrome.
2. Tap the three-dot menu (⋮), top right.
3. Tap **Install app** or **Add to Home screen** (the wording depends on your Chrome version).
4. Confirm. The Demenova icon appears on your screen.

**iPhone (Safari)**
1. Open the Demenova link in Safari.
2. Tap the **Share** button (square with an arrow pointing up).
3. Tap **Add to Home Screen**.
4. Tap **Add**.

## 2. Set up the app

1. On **Home**, tap the gear (**Settings**), top right.
2. **Language**: Español or English.
3. **Units**: Metric or Imperial.
4. **Mode**: choose **Farmer**. The app starts in Agronomist mode, which shows more numbers.

## 3. Your farm, step by step

Every step can be skipped and revisited. What you enter always replaces estimates.
Go to **Settings** > **Farm setup**.

1. **Drop a pin** (data level 0). Type the **Farm name**. Tap **Drop pin on the map** and tap where your farm is,
   or tap **Use my location**. Tap **Save pin**.
2. **Trace the farm outline (optional)** (level 1). Tap **Draw outline**, tap the corners in order (at least 3) and
   tap **Finish shape**. The outline lets Demenova split the farm into terrain-wetness zones.
3. **Add exact lots (optional)** (level 2). Tap **Draw lot**, or type the **Lot name** and tap **Add typed lot**.
   Area and plant age are optional. A typed lot with no shape stays on this phone until you draw it.

At the top you will see a badge such as **Data level 0 · confidence low**. It rises to medium-low with the outline
and to medium with lots.

**Not in this version yet:** alerts for your own farm need an engine run for its location. Until then, **Home**
shows the synthetic demo farm (marked **Demo**).

Your farm is saved on the phone first. Clearing the browser data deletes farms that have not synced.

## 4. What each level means and what to check

The level always shows as a colour **and** a word. These checks come from Demenova's actions file (Farmer mode).
They are **general guidance, not yet reviewed by a local agronomist**.

| Level | What to check |
| --- | --- |
| Green, **Normal** | "All normal. Now and then, check that the drainage channels of your lots are not blocked." |
| Yellow, **Watch** | "Water may be coming. Today, check that the drain outlets of the low lots are not blocked." |
| Orange, **Warning** | "Waterlogging risk. Today, check this lot's drainage channels and every morning look for standing water. Avoid heavy machinery on saturated soil." |
| Red, **Severe** | "Flooding possible or under way. Your safety first: do not walk into flowing water. When it is safe, look for standing water on your lots and note how many days it stays." |

The app shows the check for the level in the **What to check** card: on each lot's detail screen and, on **Home**,
below the banner when a lot is at Warning or Severe. The card is marked as not yet reviewed by a local agronomist.
In Agronomist mode the wording is more detailed.
If you see **Out of date**, the data is old: do not rely on the level until it updates.

**Where to look in the app**
1. **Home**: if a lot is at Warning or Severe, a banner appears at the top. Tap it to open the lot.
2. **Lots by risk**: the list starts with the riskiest lot and names its **Top factor**.
3. **Alerts**: the **Level changes**, newest first.
4. **Map**: each lot with its colour and its word.

## 5. Email when a lot reaches Severe

Demenova is built to send an email when a lot moves to **Severe**: one per lot per episode, in Spanish then English.
**In this version you cannot enter your email in the app yet.** The **Alerts** screen says: "Email and Telegram
settings arrive with the backend work."

## 6. Offline use and data saver

1. Open the app once with a connection: it saves the data on the phone.
2. With no signal, the app still opens and says **Offline, showing data from …** with the date of that data.
3. To use less data: **Settings** > **Storage** > **Data saver (7 days, no imagery)**.
   **Full (90 days, imagery)** keeps more history and map images.

## 7. Records and CSV export

Demenova keeps the records for you.
1. **Settings** > **Records**. You will see **Days saved on this device**.
2. Tap **Export records (CSV)**. A file downloads that opens in any spreadsheet.
3. The CSV keeps stored units (mm, °C, fractions) and the origin of every value.

In this version, the records are the replay days of the synthetic demo farm.
