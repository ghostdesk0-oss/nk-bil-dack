# Från demo till skarp drift

Demon visar flödet. Det här saknas innan en riktig kund kan boka.

## Måste finnas

1. **Backend och databas.** Bokningar, kunder, ordrar och lager ligger i dag i
   besökarens webbläsare. De behöver en server och en databas som verkstaden delar.
2. **Inloggning för verkstadsvyn.** I dag kan vem som helst växla till Verkstaden.
3. **Riktiga priser och sortiment.** Alla priser utom lyktpolering är exempel.
   Däckmodellerna är riktiga Kumho- och Vredestein-modeller, men pris och saldo är påhittade.
4. **Regnummer-uppslag.** Skanningen väljer i dag en exempeldimension utifrån
   tecknen i regnumret. Skarpt krävs en fordonsdatatjänst.
5. **Sms och mejl.** Bekräftelse och påminnelse nämns i gränssnittet men skickas inte.
6. **Betalning.** Demon säger "betalas i verkstaden". Swish eller Klarna är nästa steg.
7. **GDPR.** Integritetstext, samtycke och rutin för radering innan kunddata sparas.

## Bör finnas

- Riktiga foton från verkstaden, skåpbilen och färdiga jobb.
- EU-däckmärkning (våtgrepp, ljudnivå, rullmotstånd) per däckmodell, från leverantören.
- Öppettider och avvikelser som verkstaden själv kan ändra.
- Mätning: hur många som börjar boka och hur många som blir klara.

## Tekniska skulder att känna till

- `src/app.js` är en enda fil med global state. Den bör delas upp när backend kommer.
- Testet är ett röktest. Det finns inga enhetstester.
- 3D-scenen ritar hjulet två gånger för speglingen. Den sänker upplösningen själv på
  långsamma telefoner, men är inte uppmätt på riktiga enheter.
