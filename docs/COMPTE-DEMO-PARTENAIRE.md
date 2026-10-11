# Compte de démonstration — partenaire

À exécuter **sur ton API**, pas depuis ce dépôt. Le front n'a aucun accès à
la base ; ces commandes sont à lancer côté serveur.

Adapte les noms de tables et de colonnes : ils viennent de ce que le front
observe des réponses de l'API, pas du schéma réel.

---

## Les identifiants proposés

| | |
|---|---|
| Partenaire | **Flotte Démo** |
| Téléphone (identifiant) | `690000001` |
| Mot de passe | `Demo2026!` |
| Commission | `3` % |
| Chauffeur de test | `690000002` / `Demo2026!` |

Le téléphone sert d'identifiant : `utilisateur/loginDash` reçoit le champ
`telephone`, et l'e-mail est facultatif à la création.

---

## Option A — Tinker (recommandé)

```php
// php artisan tinker

$u = \App\Models\Utilisateur::create([
    'nom'        => 'Démo',
    'prenom'     => 'Partenaire',
    'telephone'  => '690000001',
    'email'      => 'partenaire.demo@ongo237.com',
    'password'   => bcrypt('Demo2026!'),
    'role_id'    => 1,
    'is_partner' => true,
]);

$p = \App\Models\Partner::create([
    'name'            => 'Flotte Démo',
    'user_id'         => $u->id,
    'contact'         => '690000001',
    'commission_rate' => 3,      // ← si la colonne n'existe pas encore, voir §Migration
    'is_active'       => true,
]);

echo $p->uuid ?? $p->id;   // l'identifiant à mettre dans /partner/<ici>
```

Un chauffeur rattaché, pour que les écrans ne soient pas vides :

```php
$c = \App\Models\Utilisateur::create([
    'nom'       => 'Démo',
    'prenom'    => 'Chauffeur',
    'telephone' => '690000002',
    'password'  => bcrypt('Demo2026!'),
    'role_id'   => 2,
]);

// Le lien partenaire → chauffeur (§1.2 du contrat d'API).
// Si la table n'existe pas encore, c'est LA pièce à créer en premier.
\DB::table('partner_drivers')->insert([
    'partner_id' => $p->id,
    'user_id'    => $c->id,
    'is_active'  => true,
    'created_at' => now(),
]);
```

---

## Option B — SQL direct

Le mot de passe doit être haché par l'application : un `INSERT` SQL avec un
mot de passe en clair ne permettra pas de se connecter. Génère-le d'abord :

```bash
php artisan tinker --execute="echo bcrypt('Demo2026!');"
```

```sql
INSERT INTO utilisateurs (nom, prenom, telephone, email, password, role_id, is_partner, created_at)
VALUES ('Démo', 'Partenaire', '690000001', 'partenaire.demo@ongo237.com',
        '<le hash obtenu ci-dessus>', 1, 1, NOW());

INSERT INTO partners (name, user_id, contact, commission_rate, is_active, created_at)
VALUES ('Flotte Démo', LAST_INSERT_ID(), '690000001', 3, 1, NOW());
```

---

## Migration — si `commission_rate` n'existe pas

C'est le cas le plus probable : la colonne n'a jamais existé, puisque aucun
partenaire n'est payé aujourd'hui.

```php
Schema::table('partners', function (Blueprint $table) {
    // Défaut à 0 : aucun partenaire existant ne commence à être payé
    // par le seul fait de la migration.
    $table->decimal('commission_rate', 5, 2)->default(0);
});
```

---

## Ce que le compte de démo permet de tester, et ce qu'il ne permet pas

Sans aucune route nouvelle, avec ce seul compte :

- se connecter sur `/partner/login` avec `690000001`
- la redirection vers l'espace
- le rattachement d'un compte existant depuis `/partners/add` (mode dégradé)

Il faudra les routes du contrat pour :

- l'espace `/partner/<id>` et ses quatre onglets → `v3/partner/{id}` et suivantes
- l'ajout d'un chauffeur par le partenaire → `v3/partner/{id}/drivers*`
- le suivi global admin → `dashboard/partners/activity`
- la création d'un compte partenaire depuis le front → `new_user` dans `POST dashboard/partner`

---

## À faire disparaître avant la production

Ce compte a un mot de passe connu et écrit dans un fichier du dépôt. Il ne
doit pas survivre à la phase de test.

```php
\App\Models\Utilisateur::whereIn('telephone', ['690000001', '690000002'])->delete();
```
