
# Noter

## Reflektion af sprint 13-02-2025

Sprintet startede fredag d. 7 efter sprint-planlægning.

### Projektstyring

For det første var vi nødt til at flytte vores projektstyring fra whiteboardet til online, dvs. Github Projects. Vi oprettede et Projekt-board med 5 kolonner: Stores & spikes, Backlog, Committed, In Progress og Done. Vi gik derfor fra at have vores estimerede Todo-pool til at have 2 kolonner: Backlog og Committed. Committed er her de tasks vi har planlagt til et specifikt sprint.

#### Projektboard

Vi har i dette sprint bøvlet en del med Github Projects, da dens måde at håndtere opslag på er anderledes end måden vi selv gjorde det på whiteboardet. For det første er det besværligt at skelne mellem stories, spikes og tasks. For det andet er det besværligt at tracke hvilke tasks, der hører til hvilke stories og spikes. Vi mistede også vores estimerende positionering af tasks i Todo-kolonnen, hvilket gør at de 2 karakteristika nu ikke gemmes på boardet. Det er muligt at tilfæje arbitrært information til tasks, men dette er tidskrævende sammenlignet med stickynotes. Vores projektboard er gået fra et projektstyringsværktøj til et tracking-værktøj, primært til at vores lærer har indsigt i hvad vi laver.

#### Arbejdslokation

I ugerne op til har vi begge i gruppen arbejdet på skolen. Her har vi siden tæt på hinanden med projektboardet indenfor rækkevidde. Vi har arbejdet selvstændigt og også pairprogrammet on-demand. Dette gjorde, at vi begge have nogenlunde indsigt i hinandens arbejde.

I dette sprint har MTK arbejdet delvist hjemme og på skolen, mens SFJ har arbejdet fra en hytte i Norge. Kommunikation internt i gruppen har bestået af både chat over Discord og Daily Sit-down Teams-møde kl. 10 hver dag. Dette har indtil videre fungeret, da vi har haft forskellige opgaver at løse. Dog er det just opstået et problem, hvor det ville være smart med pair-programming af en sværer opgave.

#### Sprint-estimering

Da scrum-agtig process er blevet nedtvunget over os, har vi planlagt dette sprint, ved at estimere tasks og committe til et specifikt sæt tasks fra backlog’en. Vi har oplevet, at vores problemstilling er svær at dele op på forhånd. Dette er grundet, at en stor del af vores projekt inkludere research og udvikling af software i områder, vi ikke kender i forvejen. Vi har derfor svært ved, dels hvor lang tasks kommer til at tage, og dels hvad vi skal lave i første omgang; mange af vores tasks er udarbejdet ud fra den nuværende task vi arbejder på, på et given tidspunkt.

Et eksempel på fejlestimering var omkring Estimer/design bytecode. Denne task giver ikke mening for os at lave nu, da vi arbejder med noget helt andet, men dette vidste vi ikke da vi planlagde sprintet. Tilgengæld havde vi en anden task Compiler: structs og enums, som vi fandt ud af, gav god mening at tilføje til sprintet. Denne task er fornuværende under Doing.

Det virker for os, som om at commitment er fast efter en sprint planning, og at man skal vente på, eller lave en ny sprint planning, for man legalt på ændre commitment. Dette giver lille mening for vores arbejde nuværende. Vi overvejde at starte ud med mindre sprint (2-3 dage istedet for en uge). Dette introducerer et andet problem, som er den mængde arbejde, der kræves af os, ved planlægning og afslutning af hver sprint. I sidste uge kørte vi i et kontinuum af sprint og planlægning, med løbende retrospektiv per behov. Dette virkede markant bedre sammenlignet med nuværende sprint i forhold til projektstyring.

Det er svært at teoretisere en løsning til dette problem, da “projektstyringen”, dvs. “scrum”-processen er tvunget på os, for at gøre det nemmere for vore lærere at tracke vores process. En mulighed, som også er den vi uintentionelt realisere, er at ignorere projektboardet som projektstyring og istedet bare lave projektstyring implicit. Andre muligheder kræver vi *bryder reglerne*, for stadig at kunne bruge det til projektstyring i vores projekt.

Opsummeret: vi er blevet påtvunget en meget uagil “scrum”-agtig process, som ikke passer til vores projekt. For at tilfredstille opgavestillerne samtidig med at benytte processen til vores fordel, er vi nødt til at bryde reglerne for processen. Dette er meget utilfredsstillende for os som udviklere. Det føles som en klods om benet, altså en arbitrær arbejdsopgave der egentlig bare holder os tilbage fra den relle softwareudvikling, som er den vi får noget ud af i vores læringsforløb.

#### Appen

Vi har lavet appen færdig, i forhold til de stories vi har udarbejdet med kunden. Vi skal have planlagt og udført et kundemøde, for at bekræfte vores løsning til stories’ne. Dvs. vi ikke mangler noget frontend-mæssigt i vores system. Dog har appen nuværende ingen funktionalitet ift. backend eller lignende, da vi ikke har nogen backend at udvikle op imod.

#### Slige

Vi har udviklet videre på version 2 af Slige. Runtimen er stadig ikke påbegyndt. Bytekoden er stadig ikke estimeret. Udviklingen er foregået på compileren. Her er der tilføjet funktioner, variabler, assignment, ifs og loops. Alle disse komponenter kan kompileres ned til et nyt lag vi har introduceret (MIR). Derudover er vi på nuværende tidspunkt begyndt på implementering af structs og enums. Indtil videre virker deklaration og typechecking af structs. Lowering af structs er ikke just implementeret. Enum er kun implementeret i mindre grad.

Som sagt har vi introduceret et nyt kompileringslag i Slige. Kompileringsprocessen kan nu nogenlunde forklares sådan:
- **Parser:** Tekst → AST
- **Resolver:** AST → AST + Resols
- **Checker:** AST + Resols →AST + Resols + Ty
- **AstLowerer:** AST + Resols + Ty → **MIR** (mid-level intermediary representation)
- **MirChecker:** MIR → MIR + drops

Som nævnt tidligere er **Parser**’en genbrugt fra version 1 med visse adaptioner. **Resolver**’en fungerer på samme måde som version 1’s. Resolutionslaget muterer ikke AST’et, istedet produceres der en datastruktur, Resols, som mapper hvert navn til dets definition.

**Checker**’en er implementeret anderledes end version 1’s. I version 1 lavede **Checker**’en en upfront trætravers, hvor den løste alle typer. Version 2’s fungerer on-demand, dvs. den først checker typerne for en ekspression, når man spørger den om den specifikke ekspression. Dette gør **Checker**’en selv simplere at implementere, det løser også spørgsmålet om opbevaring af typer og så undgår det unødvendig typechecking.

**MIR** er et nyt repræsentationslag vi har introduceret i compileren. Vores AST opflylder 2 funktioner, dels som AST (abstract syntax tree), men også, efter resolution og checking, som HIR (high-level intermediary repræsentation). HIR repræsenterer high-level-konstruktioner i et korrekt program (både syntaktisk og semantisk korrekt). Det nye lag er MIR (mid-level intermediary repræsentation). Dette lag repræsenterer en program i en form, der tillader forskellige analyseværktøjer. Disse værktøjer inkluderer eksempelvis controlflow-analyse (CFA/CFG) og dataflow-analyse (DFA). Til både HIR og MIR har vi taget inspiration fra Rustc. Vi har tænkt os at bruge MIR-laget til forskellige analyser. Dette inkluderer primært borrow-checking-analyse. For at forklare forskellen på AST, HIR og MIR, vil vi bruge følgende eksempel:

```rs
fn main() {
    let mut i = 0;

    loop {
        if i >= 10 {
            break;
        }
        i = i + 1;
    }
}
```
```rs
=== HIR ===
fn main() -> null {
    let mut i: int = 0;
    loop {
        if i >= 10 {
            break;
        };
        i = i + 1;
    }
}
```
```rs
=== MIR ===
fn main() {
    let _0: null
    let mut _1: int // i
    let _2: bool
    .b0: {
        _1 = 0
        goto .b1
    }
    .b1: {
        _2 = gte(copy _1, 10)
        switch copy _2
            1 => .b2
            _ => .b3
    }
    .b2: {
        goto .b3
    }
    .b3: {
        _1 = add(copy _1, 1)
        goto .b1
    }
    .b4: {
        _0 = null
        return;
    }
}
```
I første kodeblok ses inputtekst til et program. Dette er hvad AST-strukturen vil repræsentere efter parsing. I anden blok ses MIR-repræsentation af programmet efter resolution og checking. Her ses at alle typer skrevet eksplicit, men konstruktionerne er stadig de samme. I tredje og sidste kodeblok ses MIR-repræsentationen efter AST-lowering. Her ses det, at alle værdi er deklareret som variabler i toppen af funktionen. Det ses også at koden istedet for nestede bloks er organiseret som sekventielle bloks med labels. Herfra ses det tydeligt, at denne repræsentation stort set inviterer til controlflow-analyse.

**AstLowerer** konverterer HIR (AST) til MIR. Dette gør den ved at ‘elaborate’ (udfolde) alle statements og ekspressions i funktioner. Lowereren sørger for at allokere ‘locals’ til alle værdier og konvertere alle high-level konstruktioner, eksempelvis ifs og loops, til mid-level konstruktioner, som bloks og int-switch. I dette lag lever MIR stadig i fuld typekontekst, dvs. generiske funktioner med generiske typer eksisterer stadig som generiske funktioner med generiske typer.

#### Slige reflektion

Originalt havde jeg tænkt version 2 ville tage mig to uger at implementerer. Dog har det indtil videre taget fire uger. Dette er dels fordi scopet har ændret sig, men også fordi jeg i første omgang ikke vidste det totale omfang. Der er en klar prioriteringsmulighed for os i denne udviklingsprocess. Vi kan vælge at sige, vi bare skal bruge en barebones compiler og runtime. Dette kunne essentielt bare have været version 1. Men vi har istedet valgt, at vi gerne vil undersøger videregående compilerteori, og vi har derfor valgt at udvide scopet af version 2. Vi har fornuværende ikke scopet ned. Dette er af 2 årsager. Den første er, at vi har opretholdt en relativ høj udviklingshastighed, som ikke har inspireret til begræsninger af scopet. Det andet er, at vi på nuværende tidspunkt hverkan kan forholde os til en deadline eller præcise krav, for hvad vi skal bruge. Vi vurderer, at dette ikke er problematisk, da vi synes, vi har tid nok. Vi vælger derfor at fortsætte med denne udviklingsmåde. Dog vil vi være opmærksomme på overordnet roadmap, for ikke pludselig at løbe tør for tid.

#### Visioner for Slige

Som nævnt er vi ved at implementere structs og enums i compileren. Dette skal ende ud i komplekse datatyper (ADT - abstract data type) med pattern-matching-funktionalitet. For at kunne implementere, skal vi implementere brugbarhedsanalyse. Vi kan kigge på Rustc, for at se hvordan dette kan implementeres.

Derudover giver det sig selv, at alle konstruktioner skal kunne kompileres til MIR. Dette gælder også projektioner (eksempelvis arrayindeksering), som vi indtil videre ikke har implementeret ret meget. Vi har valgt at implementere projektioner på samme måde som Rustc, så vi kan kigge på deres kodebase som hjælp.

Når alt kan kompileres til MIR vil vi gerne udføre borrow-checking-analyse. Dette analyselag vil kunne tillade den memory-model, vi gerne vil have. Vi har allerede eksperimenteret med borrow-checking på MIR ­i en fork-version af version 1 af Slige. Vi ved ikke hvor lang tid, det vil kræve at implementere borrow-checking. Dette finder vi først ud af, når vi går igang.

Når vi har analyseret, checket og valideret MIR-repræsentationen, vil vi gerne kompilere programmet til en form for bytecode. Vi ved ikke endnu, om vi vil pass igennem et LIR-lag (low-level intermediary repræsentation). Dette ville kunne tillade yderligere dataflow-analyse og forskellige relaterede optimeringer. Vi syntes, det ville være interessant at eksperimentere med SSA-form (single static assignment). Dog har vi anekdotisk, at SSA-form gør en compilere markant mere kompliceret, og at det ikke nødvendigvis er fordelagtigt.

Compileren skal outputte en slags bytecode, som vi kan afvikle på en runtime. Vi har ikke designet sådanne bytekode, og derfor heller ikke implementeret en runtime. Vi vil gerne have en bytecode og en runtime der tillader, at compileren kan outputte et optimeret program, og runtimen så kan afvikle programmet med god afviklings-performance. For at tillade dette, ville det give mening at bytekoden tillader kontrol over forskellige aspekter relateret eksempelvis til memory-layout og cache-locality. 

#### Konklusion

Nu har vi afsluttet første sprint. Næste 2 uger skal vi på ML-kursus, og vi vil derfor ikke officielt fortsætte denne process. Dog har vi tænkt at fortsætte udviklingen, specielt af Slige. Når vi genoptager processen, skal vi finde ud af, hvordan vi håndtere førnævnte problemer, specielt med forplanlægning af uestimerbare arbejdsopgaver. Siden dette først er relevant om 2 uger, har vi svært ved at komme til konklusioner på nuværende tidspunkt.

TL;DR: fortsæt arbejdet og undersøg muligheder for begrænset planlægning, når muligheden opstår.


## 7-2-2025 Pre-reflektion

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

I version 1 håndteret compileren flere filer og packages ufordelagtigt. Vi har derfor et behov for et ordentligt modul-system, så det er muligt eksempelvis at implementere standard library seperat fra et enkelt program. I version 1 bestod kompileringen af én enkelt ‘package’ (crate i Rust), hvor main-filen var roden. Undermoduler var implementeret ved at koden i AST-form blev sat ind på module-deklarationens plads. Dette er det samme vi har tænkt i version 2. Problemet var med, hvad man ville tænke som seperate packages, standard-library’et eksempelvis. I version 1 var `std` et hardcoded package-navn, som pastede standard-library-koden ind.

Version 1 brugte en runtime til at køre kompileret bytekode. Bytekoden var stack-baseret og designet til at være meget simpel på at køre og kompilere til. Runtimen var implementeret til at kunne køre bytekoden med en simpel implementation. Der var også yderligere features i version 1’s runtime, som understøttede teknikfagsprojektet. Dette drejer sig om flame-graph- og code-coverage-funktionalitet. Dette har vi ikke længere brug for, og vil derfor ikke bringe med over i version 1. Et problem med version 1’s runtime og bytecode, er den meget forsimplede VM-speficifikation, altså designet af bytecode’en og runtimen. Dette fjernede en del kontrol fra kompileren, til eksempelvis hvordan værdier skulle håndteres. I version 2 vil vi gerne have, at bytekoden og runtime’en understøtter mere komplekse memory-layouts og værdihåndtering. Derfor er vi nødt til at redesigne bytekoden og derved også genimplementere runtime’en.

En anden karakteristik med version 1’s runtime var omkring afviklings-performance. Grundet den *naive* bytekode og VM-implementation var afviklingstiden for programmer suboptimalt. Yderligere tillod bytekoden ikke kompileren optimere ouputet særligt meget. Vores undersøgelser viste en 8x til 14x performance-forskel fra Slige version 1 til Python version 3.13.1 på undertegnedes bærbar. Det er ikke et krav for os, at øge afvikllings-performancen i version 2, men vi vil gerne kunne lave mere optimering af kompilerens output, og derfor vil vi redesigne bytekoden og reimplementere runtime’en i version 2, så de understøtter mere optimering.

I version 1 af slige understøttede vi kun ‘simple’ datatyper. Vi har tænkt os at implementere en webserver og resten af vores server-funktionalitet i Slige, og derfor tænker vi, at vi kræver ‘komplekse’ datatyper. Vi tager inspiration fra Rust og tænker at implementere structs og enums på samme måde, som man finder dem i Rust. Dette giver os også mulighed for at undersøge pattern-matching, som vi vil implementere i størrre eller mindre grad i version 2. Komplekse datatyper kræver mere kompleks værdihåndtering og memory-layout og, som nævnt før, kræver dette også et redesign af bytekodee og runtime’en ligesom compileren.

I version 1 kompilerede compileren næsten direkte fra high-level AST (syntax-tree) til stack-based bytekode. Dette gjorde optimeringer og andet analyse svært at implementere. Vi vil gerne kunne udføre mere analyse på koden. Denne analyse skal primært bruges til at give programmøren feedback på koden, dvs. statisk korrekthedsanalyse. Vi vil også gerne kunne bruge analysen til at lave optimeringer på compiler-outputtet, men dette er ikke en prioritet. Vi har valgt at introducere et kompileringslag i version 2: MIR (mid-level intermediary repræsentation). Meget abstrakt kan kompileringsprocessorne beskrives sådan:

Version 1:
- **Parser:** Tekst → AST (abstract syntax tree)
- **Resolver:** AST → AST + resolutions
- **Checker:** AST + resolutions → AST + resolutions + types
- **Monomorphization:** AST + resolutions + types → Mono-functions
- **Lower:** Mono-functions → Bytecode-assembly
- **Assembler:** Bytecode-assembly → Bytecode

**Parser**’en, herunder **Lexer**’en (lexical analysis) laver tekst “abc + 123” om til tokens [ident(“abc”), +, int(123)]. Dette kan **Parser**’en parse, ud fra syntax-grammatiske regler, specifikt context-free LL(1)-grammatik (der sætter færre krav til parseren), til en træstruktur AST (abstract syntax tree). **Parser**’en opdager i samme process mange syntaktiske fejl i input-programmet. Dette lag kan betegnes som grammatisk analyse.

**Resolver**’en er det første lag af semantisk analyse. Den traverserer AST’en (træstruktur) og ‘løser’ referencer, dvs. forbinder navne (identifiers) med dets definition, og laver derved navne (identifiers) om til betydningsfulde reference (symbols). Definitionsreferencers indkodes ind i AST’en, dvs dette lag *mutere* AST’en. Navne som ikke henviser til definitioner rapporteres som fejl.

**Checker**’en er det næste lag af semantisk analyse. Den traversere AST’en med symbol-løsninger. **Checker**’ens primære opgave er type-checking. Her konverteres eksplicitte typer (EType) til værdityper (VType), og udtryk uden typer får tildelt typer gennem inferens (type inference). I sammenhæng med dette tjekkes alle typer for kompatibilitet (eksempelvis er `a` og `5` i `let a: int = 5` kompatible). Dette lag tjekker også andet, eksempelvis at argumenter til funktionskald stemmer overens med funktionens parametre. Generiske funktioner tjekkes med generiske typer (istedetfor at blive tjekket efter konkretisering. Dette er forskellen imellem Rust generics og C++ template generics). Alle værdityper bliver indkodet i AST’en, og dette lag mutere derfor også AST’et. Ukompatible typer og instanser og ambigiøse typer raporteres som fejl til brugeren.

**Monomorphization** er det lag, som ‘udskære’ generiske funktioner ud i konkrete instanser. Eksempel følger:
Slige-koden:
```rs
fn inner<T>(v: T) -> T { v }
fn main() {
    let a = inner(true); // type inferred: inner::<bool>
    let b = inner(123);
}
```
bliver gennem monomorphization til
```rs
fn inner­#1(v: bool) -> bool { v }
fn inner#2(v: int) -> int { v }
fn main() {
    let a = inner#1(true);
    let b = inner#2(123);
}
```
Monomorphizeren’en starter i `main` og traverserer gennem funktionkaldshiarkiet. For hvert funktionskald den støder på til en unik funktion-instans (funktion + generiske argumenter), laver den en MonoFn-instans (monomorphized function). Dette lag mutere ikke AST’et. Resultatet af dette lag, er en liste af mono-funktioner.

**Lower**’en har sit navn fra, at den sænker repræsentationen fra high-level repræsentation (AST er high-level) til low-level repræsentation. **Lower**’en køre igennem hver mono-funktion og oversætter alle erklæringer (statements) og udtryk (expressions) til bytekode-assembly. Eksempel følger:
Slige-koden:
```rs
let a: int;
a = 3 + 4;
```
bliver oversat til
```
PushInt 3
PushInt 4
Add
Store a
```
Udtrykket `3 + 4` bliver omdannet til sekventiel stack-baseret udregning (omvendt polsk notation), og resultaten gemmes i en ‘local’, som er en scope-afhængig variabel i bytekoden. Som nævnt producerer **Lower**’en bytekode-*assembly*. Forskellen på bytekode og bytekode-assembly, er at assembly’en bruger ‘labels’ til at lave inter- og intra-proceduelle referencer, hvor at bytekoden bruger rå addresser. De rå addresser kan først beregnes efter størrelserne på programmets komponenters bytekode er fundet. Dette er først muligt, efter at bytekoden er genereret. Efter lowering til bytekode-assembly, kører vi **Assembler**’en, som indsætter rå addresser istedet for labels. Efter denne process har vi et program i bytekode-form, som kan afvikles på runtime’en.

### Version 2

Som hintet til tidligere, har vi tænkt, at implementere vores backend-funktionalitet i Slige. Dette betyder vi både skal lave low-level http-webserver-funktionalitet og high-level business-kode. Vi vil også gerne have mulighed for at benytte en database. Dette sætter nogle krav til, hvad Slige-miljøet skal kunne.

Det første krav er mulighed for at implementere en HTTP-webserver i Slige. Dette kræver interoperabilitet med operativsystemet, hvilket i vores tilfælde vil konkretisere sig i interoperabilitet med runtimen, dvs. C eller C++. Webserver-funktionalitet kræver dels stærke string-faciliteter, forskellig buffer-funktionalitet og en vis grad af asynkronitet.

Det andet krav er muligheden for at kunne modelere vores program efter vores problem (DDD). Dette kræver en måde at definere og arbejde med komplekse datatyper. Konkret har vi brug for komplekse typer og ADT’er (abstract data type). Vi har også brug for funktionalitet til at arbejde med disse.

Fordi der er så mange ændringer fra version 1 til version 2, har vi besluttet at lave både compileren og runtimen fra bunden. Indtil videre har vi arbejdet på version 2 af compileren. Version 2 af bytekoden er ikke designet og runtimen er ikke påbegyndt.

Version 2 af compileren tager udgangspunkt i Lexer’en og Parser’en fra version 1, altså genbruges disse komponenter. Disse er de eneste genbrugte komponenter indtil videre. Version 2’s AST-typer er omdefineret med ugangspunkt i Rustc’s (Rust er sproget, Rustc er compiler-implementation til Rust) AST og HIR (high-level intermediary implementation). Den største forskel på version 1 og version 2 er at Items, hvilket er module-level konstruktioner, er defineret seperat fra Statements. Derudover indeholder version 2 mere ekspressiv syntax og definitionen i sig selv er større. Udover det udfører version 2 af Lexer’en *interning* af identiifers.

Version 2 af compileren bruger også en Resolver. Denne fungerer grundlæggende på samme måde som version 1’s. Dog benytter version 2 Ribs (koncept fra Rustc) istedet for symbol-tabeller til løsning af symboler. Dette gør det konceptuelt simplere at skelne mellem type-navne og værdi-navne, og så gør det eksempelvist, at man kan omdeklarere lokale variabler i samme scope.

Vi startede ud med i version 2 at implementere compileren med en central kontekst-datastruktur (Ctx). Dette gjorde vi, fordi dele af Rustc er implementeret på sådanne måde. Specifikt opbevarer Rustc både HIR og Ty (typer) interned i kontekst-strukturen (Tcx/Tctxt/type-context af historiske årsager). Rustc benytter andre repræsentationer, som de ikke håndtere med konteksten. Vi har senere konkluderet, at kontekst-designet løser et problem for Rustc, som vi ikke har i Slige-compileren. Efter vi kom til denne konklusion, har vi forsøgt at minimere brugen af kontekststrukturen. Nuværende bruges den primært til opbevaring af packages, filer, associerede AST-træer, interning af identifiers og håndtering af error-rapportering. Vi benytter seperate centrale datastrukturer når nødvendigt, eksempelvis `ast.Cx`.

## Src

[^1]: Kent Beck, Cynthia Andres: *Extreme Programming Explained*, Addison-Wesley, 2004 p. 95


