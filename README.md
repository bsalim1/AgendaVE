# Agenda des activités

Site d'inscription aux activités pour les assistants sociaux.

- **Page publique** : les activités, la jauge de remplissage, la sélection et le formulaire du bénéficiaire.
- **Espace de gestion** (bouton « Connexion », protégé par mot de passe) : ajouter, modifier et supprimer des activités, consulter et retirer des inscriptions.

## Ce qu'il y a dans le dossier

| Élément | Rôle |
|---|---|
| `public/index.html` | La page (toute l'interface) |
| `api/` | Les fonctions serveur : activités, inscriptions, connexion, images |
| `lib/` | Code partagé (base de données, mot de passe) |
| `vercel.json` | Réglages Vercel (serveur à Paris, en-têtes de sécurité) |

## Mise en ligne sur Vercel

### 1. Compte
Créez un compte gratuit sur [vercel.com](https://vercel.com).

### 2. Envoyer le projet
Choisissez l'une des deux méthodes.

**Avec GitHub** : créez un dépôt, déposez-y tout le contenu de ce dossier, puis dans Vercel : *Add New… → Project* et importez le dépôt. Ne changez aucun réglage de construction.

**Sans GitHub** : installez [Node.js](https://nodejs.org), ouvrez un terminal dans ce dossier et lancez `npx vercel`. Répondez aux questions (connexion au compte, nouveau projet, valeurs par défaut).

### 3. Créer la base de données
Dans le projet Vercel, ouvrez l'onglet **Storage** (ou le Marketplace), ajoutez **Upstash Redis**, choisissez une **région en Europe**, puis connectez-la au projet. Vercel ajoute lui-même les variables de connexion.

### 4. Ajouter les deux variables à définir vous-même
Dans *Settings → Environment Variables* :

| Nom | Valeur |
|---|---|
| `ADMIN_PASSWORD` | Le mot de passe de l'espace de gestion. Choisissez-en un long. |
| `SESSION_SECRET` | Une longue suite de caractères aléatoires. Pour en générer une : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### 5. Redéployer
Les variables ne s'appliquent qu'aux nouveaux déploiements : lancez `npx vercel --prod`, ou dans l'onglet *Deployments* choisissez *Redeploy* sur le dernier déploiement.

### 6. Premier essai
Ouvrez l'adresse du site, cliquez sur **Connexion**, saisissez le mot de passe, puis ajoutez vos activités. Faites ensuite une inscription de test et retirez-la depuis l'onglet *Inscriptions*.

## Bon à savoir

- **Visibilité** : les activités et les jauges sont visibles par toute personne qui a l'adresse. Les noms et numéros des bénéficiaires ne sont visibles que dans l'espace de gestion.
- **Protection contre les abus** : champ piège contre les robots, limite de 30 inscriptions par heure et par adresse, 10 essais de mot de passe par quart d'heure. Si l'adresse circule trop largement, on peut ajouter un code d'accès pour les assistants sociaux.
- **Places** : le décompte est fait côté serveur, donc deux personnes ne peuvent pas prendre la dernière place en même temps. La jauge se rafraîchit toute seule toutes les 20 secondes.
- **Images** : réduites automatiquement avant l'envoi (1100 px) et stockées dans la base.
- **Données personnelles** : les bénéficiaires doivent être informés que leurs coordonnées sont enregistrées. Pensez à supprimer les inscriptions une fois les activités passées.
- **Conditions du plan gratuit Vercel** : vérifiez qu'elles conviennent à l'usage de votre association.
