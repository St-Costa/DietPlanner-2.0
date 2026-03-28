# GENERALE
- l'applicazione è "file based": ogni ingrediente, ogni ricetta e ogni giornata è un file .md salvato in una cartella (sono 3 cartelle: "Ingredienti", "Ricette", "Giornate").
- L'applicazione deve funzionare in modo che si possano apportare modifiche a ingredienti, ricette e giornate e in real time si aggiornino tutti gli altri file. Ad esempio deve essere possibile avere la schermata della lista delle ricette, e allo stesso tempo aggiornare un ingrediente di quella ricetta in un'altra finestra: una volta salvate le modifiche all'ingrediente la ricetta si aggiorna in live.

# INGREDIENTI
## Insert ingredient
La schermata permette di creare un nuovo ingrediente inserendo (non in questo ordine ma in modo bello e user friendly):
- Nome
- Tipo: l'utente può scrivere e mano a mano che scrive vengono proposti tipi già esistenti di altri ingredienti, se l'utente non clicca nessun tipo proposto, verrà creato un nuovo tipo
- Kcal
- Proteine
- Fibre
- Grassi
- Di cui saturi
- Carboidrati
- Di cui zucheri
- Sodio
- Colesterolo
Dettagli prodotto:
- Nome unità
- Peso unità (in g)
- Costo

Esempio dettagli prodotto:
- Nome unità: "Uovo"
- Peso unità: 50g
- Costo: 0.5
Cioè: 1 uovo pesa 50g e costa 50 centesimi

## Lista ingredienti
è una tabella in cui vengono mostrati tutti gli ingredienti con tutte le loro caratteristiche (tranne il tipo).
L'utente può premere dei pulsanti e filtrare per tipo: quando preme un pulsante con un certo tipo scritto, la tabella mostra solo ingredienti di quel tipo.
Cliccando sugli header, la tabella si ordina in modo ascendente rispetto all'header cliccato, cliccando di nuovo si ordina in modo discentende. Ad esempio cliccando sull'header "Kcal" la tabella ordina gli ingredienti dal più calorico al meno calorico, cliccando di nuovo dal meno calorico al più calorico.
Cliccando su un ingrediente si apre la stessa schermata di quando l'utente crea un nuovo ingrediente, ma invece di essere vuota è già precompilata con gli elementi dell'ingrediente cliccato. Modificando gli elementi, l'utente aggiorna l'ingrediente.

# RICETTE
## Lista ricetta
Molto simile alla lista ingredienti
è una tabella in cui le ricette vengono mostrate insieme ai loro valori nutrizionali, esattamente come la lista di ingredienti.
Anche qui cliccando su una ricetta si può modificare (esattamente come con gli ingredienti)

## Crea ricetta
La schermata crea ricetta permette all'utente di creare una ricetta.
Per farlo può inserire il titolo della ricetta nel campo "nome ricetta"
Gli ingredienti scelti vengono presentati in una tabella (simile a quella degli ingredienti): vengono mostrati nome e le caratteristiche (kcal, grassi...) in base alla quantità (che specifica l'utente)
Per inserire la quantità, l'utente inserisce la quantità in grammi oppure in unità. Dipende dall'ingrediente: se l'ingrediente ha un peso unità, allora l'utente inserisce quante unità (ad esempio: 1 uovo, 2 uova, 1/2 confezione, ...); altrimenti inserisce i grammi dell'ingrediente.
L'utente inserisce la preparazione in un textbox che ammette markdown. Se riesci a renderizzare il markdown mentre viene scritto ottimo: fallo. Altrimenti lo renderizzerai in un altra fase.

# GIORNATE
## Lista giornate
ogni giorno è una scheda dentro la quale compaiono le schede delle ricette con le loro caratteristiche. Inoltre presenta una scheda che riporta il totale delle caratteristiche.
Cliccando su una giornata si può modificare, similmente a come si modificano gli ingredienti e le ricette.
## Crea ricetta
Nella creazione di una giornata, si possono solamente scegliere le ricette che fanno parte di quella giornata.
Non c'è un limite al numero di ricette che una giornata può avere.

# SCHERMATA HOME
Una semplice lista di link alla lista ingredienti, lista ricette, e lista giornate. Sotto presenta un pulsante "Crea lista spesa".
Cliccandolo si possono selezionare le giornate da quelle già create, specificando un moltiplicatore (ad esempio se voglio selezionare 6 volte una stessa giornata non devo selezionarla 6 volte, ma una volta e settare a 6 il moltiplicatore).
Una volta confermato, viene generata una lista della spesa html scaricabile. La lista presenta checkbox per ogni ingrediente. Vicino ad ogni ingrediente l'utente può specificare quanto di quell'ingrediente ha già in dispensa (in g o in unità in base all'ingrediente).
ATTENZIONE: se più ricette usano lo stesso ingrediente, devi sommare la quantità totale di ingrediente e presentarlo una sola volta nella lista della spesa!
