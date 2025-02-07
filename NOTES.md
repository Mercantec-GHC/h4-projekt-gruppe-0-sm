
# Noter

## 7-2-2025

### Kunder/Produkt

Projektet startede med, at vores kunder udviklede deres app-ide. Ud fra ideen formulerede de en case beskrivelse med problematikken, som appen skal løse og en one-liner.

Ideen er indkøbsapp, som optimere indkøbs-kunders købsoplevelse. Meningen er, at gøre så kunder i dagligvarebutikker, kan komme hurtigst muligt igennem butikken. Dette skal understøttes med to primære koncepter. Det ene koncept kalder vi ‘find varer’. Meningen er, at en kunde hurtigst muligt skal kunne finde en varer i en butik. Det andet koncept kalder vi ‘betal for varer’. Her er meningen, at en kunde skal kunne registrere varer og købe dem, istedet for at skulle betale ved kassen.

Ud fra kundens ideer, har vi udarbejdet nogle designkoncepter. Det ene koncept, er en liste af varer, hvor man kan søge efter varer. Kunden kan tilføje en vare til den digitale indkøbskurv eller få vist et kort, som viser hvor i butikken, varen er. Det andet koncept er indkøbskurven. Det er en digital inkøbskurv, som repræsenterer kundens fysiske indkøbskurv. Dvs. varer som en kunde har tænkt sig at købe, tager de fra hylden og lægger i deres fysiske indkøbskurv, og det er så meningen at kunden også kan tilføje varene til den digitale indkøbskurv, for eksempelvis at kunne betale for varene.

En af måderne kunden kan tilføje varer til kurven er via ‘skan vare’-konceptet. Dette er en feature, som gør at kunden kan bruge mobilens kamera til at skanne stregkoden på en vare.

Vores design af appen inkludere først og fremmest login-funktionalitet. Dette er det første brugeren ser, når de åbner appen. Det består af en login- og opret-side. Dette er fornuværende implementeret lokalt med mock-data, hvor UI’et er som det skal vare.

Derudover inkludere designet en liste af varer. Varene har navn, billede og pris. Listen skal have en søgefunktion, men nuværende er denne funktion ikke implementeret. Der har været diskuret, om varene skulle have kategorier, men dette er fornuværende ikke konkret.

‘Skan vare’-funktionen har vi tænkt, skal bestå af en kamera-skærm. Og så når man sætter mobilen foran en varer, opdager appen stregkoden, viser en popup med varen med navn, billede, pris, og så viser appen og en ‘Tilføj’-knap, som tilføjer varen til indkøbskurven. Når en vare er blevet tilføjet, bliver appen på kamera-skærmen, så kunden kan skanne næste vare.


### Projektstyring

Vi har som delopgave i projektet at udføre struktureret projektstyring. Vi har taget udgangspunkt i Scrum-agtig udviklingsprocess. Der er flere formål med projekstyring. Et af formålene er at kunne spille opgaverne op i håndterbare tasks. Med dette skal man så, i nogen grad, kunne planlægge og estimere ud fra disse tasks. Denne planlægning bliver gjort i sprints, som i udgangspunkt er en uge, hvor man har planlagt hvilke tasks, man forventer at lave. Et andet formål er at reflektere over arbejdsprocessen. Dette gør vi i udgangspunkt med et reprospektiv møde.

Udgangspunktet for process og projektstyring er en Scrum-agtig process med ugelange sprints, daily standup, sprint planning og retrospektiv. Udgangspunktet for at holde styr på tasks er Github Projekts.


Til vores projekstyring, tager vi udgangspunkt i Extreme Programming. Specifikt denne passage fra Extremen Programming Explained:

> Write stories on iundex cards and put the cards on a prominent wall. Many reams try to skip this step and go straight to a computerized version of the stories. I’ve never seen this work. Nobody believes stories more because they are on a computer. It is the interaction around the stories that makes them valuable. The cards are a tool. The interaction and alignment of goals, shared belief in the stories, are the valuable part. You can’t automate relationships. The goal is to have a plan everyone believes in and is working to fulfill.
> 
> There is a balance of power on a project: there are people who need work done and people who do work well. They both have information necessary for believable planning. Cards on a wall is a way of practicing transparency, valuing and respecting the input of each team member.
> 
> The project manager has the task of translating the cards into whatever format is expected by the rest of the organization. He or she can also teach others to read the wall. We have nothing to hide. That’s the plan, open and accessible, thjat reflects the kind of relationships that make for the most valuable software development.[^1]

Dette har vi forsøgt at implementere. Vi har sat os ved et whiteboard på skolen. Indtil videre har kunne arbejde på skolen det samme sted. På whiteboardet har vi lavet 3 kategorier til tasks: Todo, Doing og Done. De 2 senere giver sig selv. Todo-kategorien har 2 akser. En akse for tid og en akse for værdi/akuthed. Tasks’ne skriver vi på sticky notes. Ovenover de 3 kolonner har vi en række med spikes og stories. Spikes er hovedopgaver, som ikke har med kunden at gøre. Her har vi lagt Slige-compiler og Slige-runtime. Stories er hovedopgaver, som vi har udarbejdet med kunden ud fra kravsspecifikationen. Alle vores tasks henviser til en eller flere spikes og stories.

Vi har ikke haft nogen sprint-kolonne. Dette er fordi, vi er et sted i udviklingsprocessen, hvor vi ikke har fundet værdi i at planlægge udførelse aff tasks på forhånd. Istedet har vores arbejdsprocess bestået af, at vi har en task i Doing, som vi arbejder på. Når vi så kommer på nye tasks, laver vi dem og sætter dem i Todo. Når vi gør dette, tænker vi over tid og værdi/akkuthed.

Denne projektstyring har fungeret godt for os indtil videre. Vi er 2 i teamet. Den ene laver mobilappen, mens den anden arbejder på Slige-compileren. Den sidste er svær at planlægge, da det mest er en research-opgave, og det er derfor svært at planlægge et step længere, end der hvor man er.

I næste uge kommer vi til at arbejde over Teams istedet. Det betyder også, at task-boardet skal digitaliseres, for at lærerene kan følge med i det. Derudover har vi fået som opgave at planlægge ugerne fremadrettet som sprints, dvs. med planlagte tasks til hver sprint.

### Implementering af app

Vi har 3 slags komponenter i appen: Pages, widgets og repos. Pages er de sider, som kunden kan navigere til og se. Hver side har sit specifikke formål. Alle sider er implementeret som widgets og navigation mellem dem er gjort med `Navigator.of(context).push()` og `avigator.of(context).pop()`. Widgets er også widgets, men menes som de komponenter, der bliver genbrugt igennem appen. Repos er data-controllers. Dvs. alt data i appen, bliver håndteret gennem Repos.

Måden vi har implementeret state-håndtering i appen er med provider/consumer pattern. På denne måde har vi afkoblet logikkoden fra UI-koden og gjort det nemt at pass state gennem appen, til de widgets der bruger eller ændre state.

Vi har færdiggjort 2 stories, mangler ‘skan varer’-siden, men også implementeret det meste af resten af stories’ne, så det hele virker lokalt på mobilen. Vi har ikke lavet en backend server, dvs. funktionaliteten fungere istedet med mock-data.

### Flutter

Ift. til hvad vi har lært med Flutter. Den vigtigste pointe, er at det er det værd, at gøre noget ordentligt. En kodebase bliver meget hurtigt svær at arbejde med, hvis man ikke implementere komponenter smart. Dette gælder specielt state-håndtering.

Derpå har vi lært, at det er smart at bruge provider/consumer pattern til state-håndtering.

Forskellige steder i koden har vi syntes overkill at bruge provider/consumer, da det dog tilføjer noget boilerplate-kode. Her har vi brugt setState istedet. Vi har valgt kun at bruge setState indenfor den samme widget.

Vi har også lært, at mange af de widgets man vil bruge, kommer allerede Flutter. Derfor burde man kigge på Flutter’s Widget Catalog før man forsøger at implementere sine egne widgets.

### Slige-miljø’et

Slige version 1 blev udviklet i december til et skoleprojekt. Målene var at lave et simpelt sprog-miljø, som vi kunne bruge til at udvikle forskellige værktøjer. Nu er vi der, hvor vores behov for Slige har ændret sig. Derfor arbejder vi på en version 2 af Slige. Version 1 havde begrænset funktionalitet ift. sprog-features, programanalyse og afviklingspotientiale. Med version 2 forsøger vi at udvide miljøet, til at understøtte dette funktionalitet bedre.

Slige version 1 har variabler, funktioner, integers, booleans, strings, arrays, anonyme structs, if-udtryk og forskellige loop-udtryk. Dette opfyldte behovet for version 1.

Der var nogle problemer, specielt med arrays og anonyme structs. Compileren havde meget lille forstand på arrays og structs. Dette gjorde det svært, at bruge dem i praksis. Derudover understøttede runtimen dem dårligt. Vi har derfor vurderet, at vi har et behov for, at arrays og structs implementeres på en anden måde.

Med version 1 af compileren var der nogle problemer med kompilering af visse udtryk. Det var svært at navigere i kompileringen, som var derfor, fejlende opstod i første omgang og derfor de ikke var nemme at udrette. Vi har derfor et behov for at kompilering bliver mere navigerbar. Specielt også med de sprog-features, vi gerne vil tilføje.

I version 1 understøttede vi kun ‘simple’ variabler. Vi vil gerne kunne understøtte *patterns*, som man kender dem fra Rust. Patterns, til vores formål, gør det nemmere at skrive korrekt kode. For at kunne implementere patterns, krævede et stor restrukturering af compileren. For det første kræver patterns mere kompleks symbol-resolution end med simple variabler. For det andet kræver patterns mere kode-generering. Og så kræver patterns mere ift. analyse og validering. Med det ekstra analyse og validering har vi også mulighed for at tilføje en anden feature inspireret af Rust, Rust-enums. Når validering af patterns er på plads, kræver det ikke meget ekstra implementering for også at kunne understøtte både Rust-enums, men også Rust-structs med *unit*-, *tuple*- og *struct*-varianter.

I version 1 håndteret compileren flere filer og packages ufordelagtigt. Vi har derfor et behov for et ordentligt modul-system, så det er muligt eksempelvis at implementere standard library seperat fra et enkelt program.

TODO: runtime, struct- og enum-defs, compiler-backend, http-server

## Src

[^1]: Kent Beck, Cynthia Andres: *Extreme Programming Explained*, Addison-Wesley, 2004 p. 95


