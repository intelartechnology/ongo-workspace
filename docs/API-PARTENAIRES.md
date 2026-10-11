# Contrat d'API — Espace partenaire

Ce document fige les routes attendues par le front. Chaque écran livré pointe
vers l'une d'elles ; tant qu'une route manque, l'écran correspondant affiche
son état d'erreur mais ne casse rien d'autre.

Toutes les réponses suivent la forme déjà en vigueur :

```json
{ "success": true, "message": "…", "data": … }
```

---

> **Statut : implémenté.** Les routes décrites ici existent dans
> `../ongo-api` et répondent. Ce document reste la référence du contrat ;
> ce qui n'est pas encore fait est rassemblé au §7.

## 1. Le modèle de données

### 1.1 Commission

Le taux partenaire s'exprime en **points de course**, pas en part de la
commission. Un partenaire à `3` touche 3 % du montant de chaque course de ses
chauffeurs, prélevés **sur la part Ongo**, jamais sur celle du chauffeur.

Sur une course de 10 000 FCFA, commission plateforme à 20 % :

| Part | Taux | Montant |
|---|---|---|
| Chauffeur | 80 % | 8 000 |
| Ongo brut | 20 % | 2 000 |
| → partenaire | 3 % | 300 |
| → Ongo net | 17 % | 1 700 |

**Contrainte serveur obligatoire** : `commission_rate <= ` taux de commission
plateforme en vigueur (réglage `commission.*`, cf. `v3/admin/settings`). Le
serveur refuse un taux supérieur. Si le taux plateforme baisse sous le taux
d'un partenaire existant, ne pas corriger en silence : rendre le partenaire
`commission_invalid: true` et le signaler à l'admin.

Valeur par défaut à la création : **0**. Aucun partenaire n'est payé
aujourd'hui, donc un défaut à 0 ne coupe aucun revenu existant.

### 1.2 Lien partenaire → chauffeur

**`partner_drivers` est la seule source de vérité.** Une ligne par
rattachement, `user_id` unique.

Le rattachement se déduisait auparavant des véhicules de `fleets`. Les deux
lectures ont coexisté un temps, et elles ne disaient pas la même chose : un
partenaire voyait dans son rapport des courses dont il ne toucherait jamais la
commission, puisque le versement n'a jamais retenu que le lien direct. Les
rattachements hérités ont été repris en base (migration du 10/10/2026, 5
chauffeurs), et toute la lecture passe désormais par `partner_drivers`.

`fleets` reste en place et continue de dire quel **véhicule** appartient à
quel partenaire : ce n'est pas la même question, et rien ne s'en sert pour le
calcul.

Un chauffeur appartient à **au plus un** partenaire. Toute tentative de
rattacher un chauffeur déjà rattaché doit être refusée explicitement
(cf. `already` dans le lookup).

### 1.3 Identifiant d'espace

Le front appelle `:partnerId`. Un uuid est préférable à l'id numérique : il
ne révèle pas le nombre de partenaires et ne s'énumère pas. Si tu pars sur
l'id numérique, l'autorisation serveur devient d'autant plus critique.

---

## 2. Autorisation

**Le point le plus important de ce document.**

L'identifiant de l'espace est dans l'URL. Le front ne peut donc rien
garantir : `PartnerProtectedRoute` vérifie `user.is_partner`, ce qui
n'empêche pas un partenaire d'ouvrir l'espace d'un autre en changeant l'uuid.

Chaque route `v3/partner/{partnerId}/…` doit vérifier côté serveur que
l'appelant est **soit** le propriétaire de ce partenaire, **soit** un admin.
Sinon → 403.

Les routes admin (`dashboard/partner/…`) restent réservées à l'admin.

---

## 3. Routes — côté admin

### 3.1 Rechercher un compte par téléphone

```
POST dashboard/partner/lookup
{ "phone": "6XXXXXXXX" }
```

```jsonc
// Compte trouvé
{ "success": true, "data": {
    "found": true,
    "user": { "id": 42, "nom": "Nyamoutet", "prenom": "Lamine",
              "telephone": "6XXXXXXXX", "email": "…" },
    "already_partner": false   // true si ce compte est déjà partenaire
}}

// Aucun compte
{ "success": true, "data": { "found": false } }
```

Ne jamais répondre 404 pour « non trouvé » : c'est un résultat de recherche
valide, pas une erreur. Le front distingue les deux pour proposer la création.

### 3.2 Créer un partenaire

```
POST dashboard/partner
{
  "name": "Flotte Lamine",
  "user_id": 42,              // si rattachement à un compte existant
  "contact": "6XXXXXXXX",
  "commission_rate": 3,       // points de course, défaut 0

  // OU, si aucun compte n'existe — le serveur crée le compte :
  "new_user": { "nom": "…", "prenom": "…", "telephone": "…", "email": "…" }
}
```

`user_id` **ou** `new_user`, jamais les deux. Avec `new_user`, le serveur crée
le compte, pose `is_partner`, et renvoie l'utilisateur créé dans `data.user`.

Réponse :

```jsonc
{ "success": true, "data": {
    "id": 7, "uuid": "…",
    "user": { "id": 42, "telephone": "6XXXXXXXX", … },

    // UNIQUEMENT quand le serveur vient de créer le compte (`new_user`).
    // Rendu une seule fois, en clair, jamais relisible ensuite.
    "password": "K7M2P9"
}}
```

**Sans ce champ, un partenaire créé ne peut pas se connecter.** L'écran
affiche le mot de passe une fois à l'admin, sur le modèle déjà en place pour
les marchands (`EatStores.tsx:188`). Si tu préfères un envoi par SMS, dis-le :
l'écran affiche alors un avertissement au lieu d'un mot de passe, pour que
l'admin ne promette pas des accès qui n'arriveront pas.

**Identifiant de connexion : le téléphone.** `utilisateur/loginDash` reçoit
déjà le champ `telephone` depuis l'écran de connexion partenaire — seul le
libellé disait « e-mail », c'est corrigé. L'e-mail restant facultatif à la
création, il ne peut pas servir d'identifiant.

### 3.3 Ajuster la commission

```
POST dashboard/partner/{id}/commission
{ "commission_rate": 5 }
```

Refus si supérieur au taux plateforme : `{ "success": false, "message": "Le taux ne peut pas dépasser la commission plateforme (20 %)" }`

### 3.4 Suspendre / réactiver

```
POST dashboard/partner/{id}/toggle
```

**Existe déjà.** Aucun changement. Préciser dans la réponse l'effet sur les
chauffeurs : un partenaire suspendu empêche-t-il ses chauffeurs de rouler ?
(cf. §6, question ouverte).

### 3.5 Liste des partenaires

```
GET dashboard/partner        // existe déjà
```

Ajouter à chaque ligne : `commission_rate`, `drivers_count`,
`commission_invalid` (cf. §1.1).

---

## 4. Routes — espace partenaire

Préfixe commun : `v3/partner/{partnerId}`. Autorisation selon §2.

### 4.1 L'espace lui-même

```
GET v3/partner/{partnerId}
```

```jsonc
{ "success": true, "data": {
    "id": 7, "uuid": "…", "name": "Flotte Lamine",
    "commission_rate": 3,
    "is_active": true,              // false si suspendu par l'admin
    "contact": "6XXXXXXXX",
    "me": { "id": 42, "role": "owner" },   // "owner" | "admin"
    "stats": {
      "drivers_total": 12, "drivers_active": 9,
      "courses_month": 430, "revenue_month": 10000000,
      "commission_month": 300000
    }
}}
```

`commission_month` est **ce que le partenaire a gagné**, pas le chiffre
d'affaires. Le front affiche les deux et ne recalcule rien : le taux a pu
changer en cours de mois, et un recalcul au taux courant réécrirait le passé.

### 4.2 Ses chauffeurs

```
GET  v3/partner/{partnerId}/drivers?q=&statut=&page=
```

```jsonc
{ "success": true, "data": { "data": [ {
    "id": 51, "nom": "…", "prenom": "…", "telephone": "…",
    "photo": null,
    "is_active": true,            // peut-il prendre des courses
    "created_at": "2026-10-01T09:00:00Z",
    "vehicule": { "id": 9, "matricule": "LT 1234 AB", "modele": "Yaris",
                  "categorie": "ECO" },
    "stats": { "courses_total": 120, "revenue_total": 840000 }
} ], "links": […] }}
```

### 4.3 Rechercher un chauffeur par téléphone

```
POST v3/partner/{partnerId}/drivers/lookup
{ "phone": "6XXXXXXXX" }
```

```jsonc
{ "success": true, "data": {
    "found": true,
    "user": { "id": 51, "nom": "…", "prenom": "…", "telephone": "…" },
    "already": false,          // déjà rattaché à CE partenaire
    "taken": false             // rattaché à un AUTRE partenaire → refuser
}}
```

`taken: true` ne doit jamais révéler **quel** partenaire détient le chauffeur.

### 4.4 Rattacher ou créer un chauffeur

```
POST v3/partner/{partnerId}/drivers
{
  "user_id": 51,                       // compte existant
  // OU
  "new_user": { "nom": "…", "prenom": "…", "telephone": "…" },

  "vehicule": { "matricule": "…", "modele": "…", "categorie_id": 1 }
}
```

Le serveur crée le compte si `new_user`, pose le rôle chauffeur, crée le
véhicule, l'inscrit au suivi temps réel, et rattache le tout au partenaire.

Renvoyer `data.tracking_enabled` (booléen) : si l'inscription au suivi
échoue, le chauffeur existe mais reste invisible sur la carte. Le front le
dit explicitement plutôt que d'annoncer un succès trompeur.

### 4.5 Activer / désactiver un chauffeur

```
POST v3/partner/{partnerId}/drivers/{driverId}/toggle
```

Ne **pas** réutiliser `v2/vehicule/activate-or-desactivate-cab` : cette route
est admin et véhicule-centrée. Un partenaire ne doit pouvoir basculer que ses
propres chauffeurs.

### 4.6 Détacher un chauffeur

```
POST v3/partner/{partnerId}/drivers/{driverId}/remove
```

Détache sans supprimer le compte : le chauffeur reste sur la plateforme,
simplement plus rattaché. Les courses passées gardent leur attribution.

### 4.7 Les courses de ses chauffeurs

```
GET v3/partner/{partnerId}/courses?driver_id=&statut=&du=&au=&page=
```

Chaque ligne porte `commission_partenaire` : le montant **figé au moment de
la course**, jamais recalculé.

### 4.8 Rapport

```
GET v3/partner/{partnerId}/report?du=&au=&driver_id=
```

```jsonc
{ "success": true, "data": {
    "periode": { "du": "2026-10-01", "au": "2026-10-31" },
    "totaux": { "courses": 430, "chiffre_affaires": 10000000,
                "commission_partenaire": 300000, "taux_moyen": 3 },
    "par_chauffeur": [ { "driver_id": 51, "nom": "…",
                         "courses": 120, "chiffre_affaires": 840000,
                         "commission": 25200 } ]
}}
```

`taux_moyen` est utile si le taux a changé en cours de période : il rend
l'écart lisible au lieu de le faire passer pour une erreur de calcul.

---

## 4bis. Route — suivi global (admin)

### Activité de tous les partenaires

```
GET dashboard/partners/activity?du=&au=&statut=&q=&tri=
```

`statut` ∈ `actif` | `suspendu` | `inactif` (aucune course sur la période).
`tri` ∈ `commission` | `courses` | `chiffre_affaires` | `nom`.

```jsonc
{ "success": true, "data": {
    "periode": { "du": "2026-10-01", "au": "2026-10-31" },

    // Totaux sur la période, TOUS partenaires confondus et calculés
    // côté serveur. Le front ne les resomme pas depuis les lignes :
    // celles-ci sont paginées, et deux totaux divergents sur un écran
    // financier coûtent plus de confiance qu'ils ne font gagner.
    "totaux": {
      "partenaires": 14,
      "partenaires_actifs": 9,
      "chauffeurs": 128,
      "courses": 4300,
      "chiffre_affaires": 98000000,
      "commission_due": 2940000     // ce qu'Ongo doit aux partenaires
    },

    "data": [ {
      "id": 7, "uuid": "…", "name": "Flotte Lamine",
      "is_active": true,
      "commission_rate": 3,
      "commission_invalid": false,
      "drivers_total": 12, "drivers_active": 9,
      "courses": 430,
      "chiffre_affaires": 10000000,
      "commission": 300000,
      "derniere_course": "2026-10-09T18:22:00Z"   // null si aucune
    } ],
    "links": [ … ]
}}
```

`commission_due` est **ce qu'Ongo doit**, pas ce qu'Ongo encaisse. Les deux se
confondent à la lecture ; l'écran les nomme explicitement.

`derniere_course` est ce qui distingue un partenaire sans activité d'un
partenaire qui n'a jamais démarré. Un partenaire à 0 course sur la période
mais avec une dernière course datée n'appelle pas la même réaction qu'un
partenaire créé il y a deux mois et jamais utilisé.

---

---

## 4ter. Routes ajoutées en cours de route

### Équipe du partenaire

```
GET  v3/partner/{id}/team
POST v3/partner/{id}/team          { phone, role: "owner"|"staff" }
POST v3/partner/{id}/team/remove   { user_id }
```

Deux rôles, là où le marchand en a trois. `staff` gère les chauffeurs et
consulte les courses ; il ne voit **ni** le portefeuille, **ni** le rapport,
**ni** la commission — le serveur renvoie `null` ou refuse, et le front retire
les onglets. Un gestionnaire de parc n'a pas à connaître la marge de son
employeur.

On invite un compte **existant**. Ouvrir la création ici donnerait à un
partenaire le moyen de peupler la plateforme de comptes qu'Ongo n'a jamais
vus : un chauffeur se crée, un collègue s'invite.

### Portefeuille

```
GET  v3/partner/{id}/wallet?du=&au=
POST v3/partner/{id}/wallet/withdraw   { amount, receiver_phone, mode }
```

Le solde et les écritures sont ceux du **compte propriétaire**. Il n'y a pas
de porte-monnaie propre au partenariat : en créer un dédoublerait la vérité
sur une même somme. Le grand livre est `payment_transactions`, rattaché par
`paymentwallets.owner_id` ; seules les écritures `verified` comptent.

Le retrait passe par `payOut`, la même porte que les retraits chauffeur. Un
second chemin vers l'argent voudrait dire deux endroits où vérifier un solde,
et tôt ou tard deux résultats différents.

---

## 4quater. Le versement de la commission

`App\Services\PartnerAccounting::record(Course $course)`, appelée depuis
`CourseController::finCourse`, **après** `collectFees` — on ne reverse pas une
commission qu'Ongo n'a pas encore encaissée.

### D'où sort l'argent

C'est un **transfert entre deux comptes d'Ongo**, pas une création de monnaie.
`collectFees` crédite le compte racine des 20 % ; `PartnerAccounting` le
débite des 3 % du partenaire et crédite le compte propriétaire. La part du
chauffeur n'est touchée à aucun moment.

Vérifié en base sur une course de 10 000 FCFA à 3 % : partenaire `0 → 300`,
Ongo `334 940 → 334 640`. Les deux mouvements se compensent au franc près.

### La garantie contre le double versement

`partner_commissions.course_id` est **unique**. La ligne est écrite *avant*
tout mouvement d'argent, dans la même transaction : si une autre exécution a
pris les devants, la contrainte lève avant qu'un franc ne bouge. L'ordre
inverse aurait crédité puis échoué.

Un second appel sur la même course est donc ignoré — testé.

### Les six cas où rien n'est versé

| Situation | Raison |
|---|---|
| Chauffeur sans partenaire | le cas de la grande majorité des courses |
| Taux à 0 % | le défaut de tout nouveau partenariat |
| Partenaire suspendu | `blocked_at` sur le compte propriétaire |
| Chauffeur mis au repos | `partner_drivers.is_active` à faux |
| Taux > part plateforme | viderait la part d'Ongo ; journalisé en `warning` |
| Course non terminée, ou montant nul | rien à répartir |

`partner_drivers` fait foi, ici comme dans toute la lecture (cf. §1.2).

### Pourquoi un service à part

`CourseController` règle une course à l'ancienne : un `Request` fabriqué, trois
appels successifs, aucune transaction englobante, les exceptions avalées. S'y
greffer aurait rendu les deux indissociables — toucher au reversement du
chauffeur aurait risqué la commission du partenaire, et l'inverse.

`PartnerAccounting` suit donc `Services/Eat/MerchantAccounting` : un service
par domaine, une table de grand livre avec clé unique sur le document source,
un taux figé à l'écriture. `record()` **ne lève jamais** : une commission qui
échoue ne doit pas empêcher une course de se clôturer ni un chauffeur d'être
payé. L'échec part dans les logs avec le `course_id`, et la ligne reste
absente — ce qui permet de la rejouer sans risque de double paiement.

---

## 5. Ce qui ne doit pas bouger

- `GET dashboard/partner`, `GET dashboard/partner/{id}`,
  `POST dashboard/partner/{id}/toggle`, `dashboard/fleet*` : inchangés.
- `utilisateur/get-partner-stats`, `utilisateur/partner-detail`,
  `utilisateur/get-partner-courses` : **conservés**. Les anciennes routes
  `/partner/dashboard`, `/partner/courses`, `/partner/vehicles` continuent de
  fonctionner et redirigent vers le nouvel espace. Ne pas les supprimer tant
  que les partenaires existants ne sont pas passés sur la nouvelle URL.
- Le partage chauffeur (80 %) : **aucun changement**. La commission
  partenaire sort de la part Ongo.

---

## 6. Questions ouvertes — à trancher avant mise en service

1. **Un partenaire suspendu : ses chauffeurs roulent-ils encore ?** Si oui,
   qui touche les 3 % pendant la suspension ? Si non, suspendre un partenaire
   coupe les revenus de ses chauffeurs, ce qui est une décision lourde.
2. **Un chauffeur rattaché en cours de mois** : le partenaire touche-t-il sur
   les courses antérieures au rattachement ? Le front suppose **non**.
3. **Deux des écrans affirment des taux en dur** :
   `partner/VehicleReportPrintPage.tsx:218` (« 80 % ») et
   `contributor/Payments.tsx:162` (« 20 % »). Ils doivent lire le réglage.
   Tant que ce n'est pas fait, ils mentiront si le taux change.
4. **Qui a agi ?** Un admin peut ouvrir l'espace d'un partenaire et y agir —
   ajouter un chauffeur, le désactiver, le détacher. Côté serveur, rien ne
   distingue aujourd'hui cette action de celle du partenaire lui-même.

   L'écran prévient l'admin par un bandeau, mais un bandeau ne journalise
   rien. En cas de litige — « je n'ai jamais désactivé ce chauffeur » — il
   n'existe aucune trace permettant de trancher.

   À prévoir : enregistrer l'acteur réel (`acted_by_user_id`) sur chaque
   écriture des routes `v3/partner/{partnerId}/…`, distinct du partenaire
   concerné. Le coût est faible maintenant, élevé une fois l'historique
   constitué sans cette colonne.
5. **Le détachement d'un chauffeur et les commissions en cours.** §4.6 dit
   que les courses passées restent acquises au partenaire. Reste le cas des
   courses **en cours** au moment du détachement : commission due ou non ?
   Le front n'affiche aujourd'hui aucune hypothèse là-dessus.

---

## 7. Ce qui reste à faire

1. **Le suivi temps réel d'un chauffeur ajouté par un partenaire.**
   `attachDriver` renvoie `tracking_enabled: null` : l'inscription Firestore
   est faite côté client, le serveur ne peut pas l'affirmer. Le front annonce
   donc un succès sans promettre le suivi.

3. **`uuid` sur `partners`.** Les URL acceptent déjà les deux formes ; la
   colonne n'existe pas encore. Tant qu'elle manque, les identifiants sont
   numériques et séquentiels — d'où le refus indifférencié en 404, pour ne pas
   laisser dénombrer les partenaires.

---
