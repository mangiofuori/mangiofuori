-- Mangio Fuori: tabella dei locali (incolla tutto nell'SQL Editor di Supabase e premi Run)
create table if not exists public.venues (
  id text primary key,
  name text not null,
  city text not null,
  country text not null default 'Italia',
  cuisine text not null,
  address text not null,
  rating int not null check (rating between 1 and 10),
  price int not null,
  lat double precision not null,
  lon double precision not null,
  photos text[] not null default '{}',
  text text not null default '',
  approx boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.venues enable row level security;
drop policy if exists "lettura pubblica" on public.venues;
create policy "lettura pubblica" on public.venues for select using (true);

insert into public.venues (id,name,city,country,cuisine,address,rating,price,lat,lon,photos,text,approx) values
('v1','Futura Pizzeria Romana','Milano','Italia','Pizzeria','Via Borsieri 28, Milano',8,35,45.4888,9.1892,array['photos/futura.jpg'],'Parto col dire che ci volevo andare da febbraio. Le prenotazioni erano sempre piene (da marzo c’erano prenotazioni a giugno). Chiami e nessuno risponde, dopo mesi controllo e per culo c’era posto di domenica…',false),
('v2','Yanso Korean BBQ','Milano','Italia','Coreano','Via Paolo Sarpi 27, Milano',7,28,45.4813,9.1761,array['photos/yanso.jpg'],'Sti cani da caccia hanno cambiato il cinese che c’era prima dove facevano gli spiedi di carne e tutto e hanno fatto l’all you can eat di carne coreana…',false),
('v3','Chiosco Maradona','Milano','Italia','Street food','Via Tabacchi 33, Milano',8,8,45.4505,9.188,array['photos/chiosco-maradona.jpg'],'Roba da intenditori, penso che nessuna norma igienica sia stata rispettata. È aperto solo di notte, dalle 9.30 alle…',true),
('v4','Da Vito','Milano','Italia','Carne','Via Lorenteggio 177, Milano',10,25,45.4486,9.1336,array['photos/da-vito.jpg'],'Non c’era una persona che me ne avesse parlato male, e infatti merita già prima di spiegare un 10/10. In ordine: due tartare e due straccetti di pollo, cambiavano i condimenti della carne, tutti e 4 buonissimi (abbiamo diviso la porzione in due ma consiglio anche 1 a testa). Carpaccio con olio e limone, bello leggero e saporito. Contorni (vanno a giornata): evitate le patate che appesantiscono se dovete scannarvi di carne. Due spiedini, una bombetta, un triangolo con gli spinaci e due salsicce al finocchio…',false),
('v5','Enrico Porzio','Milano','Italia','Pizzeria','Via Solari 34, Milano',8,20,45.4515,9.162,array['photos/porzio.jpg'],'Pizzeria napoletana top. Ci sono un botto di pizze, sicuramente tornerò a provarne altre. La prima pizza…',true),
('v6','KFC Assago','Milano','Italia','Fast food','Milanofiori, Assago (MI)',8,12,45.4095,9.148,array['photos/kfc.jpg'],'Da asporto. Sto panino ignorantissimo, un bucket da 10 pezzi di tenders, una box con patatine e altri due tenders, altre due…',true),
('v7','Forno Granfior','Milano','Italia','Forno','Via delle Forze Armate, Milano',10,5,45.4565,9.109,array['photos/granfior.jpg'],'10/10 come al solito. 5 euro calzone prosciutto e…',true),
('v8','Il Panino Perfetto','Milano','Italia','Hamburger','Viale Bligny 1, Milano',8,14,45.4515,9.193,array['photos/panino-perfetto.jpg'],'Paninate ignoranti. Io ho preso USA five: doppio smash di angus con…',true),
('v9','El Porteño Arena','Milano','Italia','Argentino','Viale Elvezia 4, Milano',8,60,45.477,9.1745,array['photos/porteno.jpg'],'Cena per anniversario. Intanto, appena entri ti assale quel senso di tranquillità dato che…',true),
('v10','Vecchia Lira, The Club','Milano','Italia','Carne','Corso Garibaldi, Milano',9,55,45.476,9.1832,array['photos/vecchia-lira.jpg'],'Cena da paura, posto già provato e recensito, la carne è buonissima, direi pure meglio del porteno brohibido e…',true),
('v11','Panini Galiano 1974','Milano','Italia','Panini','Via Ravizza 5, Milano',9,9,45.4657,9.1536,array['photos/galiano.jpg'],'TOOOOOOOPPPPP, da paura ragazzi, andate tutti a comprarvi sto panino con la battuta di fassona, a mani basse uno…',true),
('v12','Panino Giusto','Milano','Italia','Panini','Via Buonarroti 15, Milano',7,16,45.4683,9.1587,array['photos/panino-giusto.jpg'],'In ordine: Club iberico 16 €, pollo, melanzane e zucchine 15 € (mi sembra), Rustin 9,50 €…',true),
('v13','Moscatelli','Milano','Italia','Italiano','Corso Garibaldi 91, Milano',6,35,45.4787,9.1815,array['photos/moscatelli.jpg'],'Affianco a pattini, lo guardavamo da un po’ e sembrava bello invitante, sempre pieno di gente, piatti colorati…',true),
('v14','Singapore','Milano','Italia','Cinese','Via Vincenzo Foppa 40, Milano',9,25,45.453,9.158,array['photos/singapore.jpg'],'In ordine di foto: carne di manzo con bambù e funghi 10/10…',true),
('v15','Le Tre Regioni','Milano','Italia','Panini','Via Palermo 16, Milano',7,6,45.4768,9.1862,array['photos/tre-regioni.jpg'],'Negozietto piccolo a conduzione familiare, ormai rari da trovare. Fa panini a 6 euro, belli pieni con bresaola/coppa e condimento con olio e limone, scamorza… pane un po’ stopposo, l’unico problema…',true),
('v16','Cajò','Alghero','Italia','Pizzeria','Via Gioberti 4, Alghero (SS)',8,15,40.556,8.3205,array['photos/cajo.jpg'],'Tendenzialmente in Sardegna pensavo di mangiare nei ristoranti, e soprattutto roba del posto. La mia ragazza aveva…',true),
('v17','Bar Focacceria Milese','Alghero','Italia','Focacceria','Via Giuseppe Garibaldi 11, Alghero (SS)',7,15,40.5588,8.3168,array['photos/milese.jpg'],'Baretto sul lungomare di Alghero. Siam passati un paio di volte…',true),
('v18','Trattoria Lo Romanì','Alghero','Italia','Sardo','Via Lazzaretto 9, Alghero (SS)',9,35,40.5578,8.319,array['photos/romani.jpg'],'A mani basse posto migliore dove mangiare ad Alghero. Parlando con qualche persona del posto, qua vanno a mangiare durante l’anno quando non ci sono turisti.',true),
('v19','La Meridionale','Milano','Italia','Pizzeria','Via Marchesina 11, Trezzano sul Naviglio (MI)',6,20,45.415,9.0735,array['photos/meridionale.jpg'],'Non mi ha entusiasmato ma non male, abbiamo mangiato bene. Abbiam preso un po’ di roba da mettere in mezzo, crocché vari e arrosticini che erano veramente buoni. Pizza l’ho presa con salsiccia, patate e provola. Dolce alla fine ho preso tiramisù con kinder bueno, buono buono.',true)
on conflict (id) do nothing;
