import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANG_KEY = '@monet_lang';

const translations = {
  en: {
    // Common
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving…',
    ok: 'OK',
    edit: 'Edit',
    update: 'Update',
    error: 'Error',
    success: 'Success',
    available: 'Available',
    saved: 'Saved',

    // Tab labels
    tabWallet: 'Wallet',
    tabSend: 'Send',
    tabActivity: 'Activity',
    tabSettings: 'Settings',

    // Wallet screen
    yourBalance: 'Your balance',
    addMoney: 'Add money',
    addMoneySubtext: 'From bank, credit or debit card',
    transferMobile: 'Transfer to Mobile Money',
    transferMobileSubtext: 'M-Pesa · Airtel · Orange',
    recentActivity: 'Recent activity',
    banner1Title: 'Send to DRC',
    banner1Subtitle: 'Fast, low-cost transfers',
    banner2Title: 'M-Pesa & Airtel',
    banner2Subtitle: 'Cash out to mobile money',
    banner3Title: 'Your money, safe',
    banner3Subtitle: 'Secure wallet for diaspora',

    // Send screen
    sendMoney: 'Send money',
    sendMoneySubtitle: 'Send to family or friends in seconds',
    amount: 'Amount',
    sendTo: 'Send to',
    searchPlaceholder: 'Search by name or phone number',
    noOneFound: 'No one found. Try a different name or number.',
    noName: 'No name',
    mostSent: 'Most sent',
    mostSentEmpty: 'Send money to see your most sent contacts here.',
    noContacts: 'No contacts yet. Ask friends to join Monet to send them money.',
    payFrom: 'Pay from',
    walletBalance: 'Wallet balance',
    debitOrCreditCard: 'Debit or\ncredit card',
    bankAccount: 'Bank account',
    errSelectRecipient: 'Select a recipient and enter a valid amount',
    errInsufficientWallet: 'Insufficient wallet balance. Add money or choose another payment source.',
    successTransferWallet: "Transfer completed. The recipient's balance has been updated.",
    successTransferExternal: 'Transfer initiated. The recipient will see the balance when the payment is confirmed.',
    errTransferFailed: 'Transfer failed',
    errLoadRecipients: 'Could not load recipients. Check your connection.',

    // Activity screen
    moneyInOut: 'Money in & out',
    noTransactions: 'No transactions yet.',
    withdrawal: 'Withdrawal',
    received: 'Received',
    transfer: 'Transfer',

    // Settings screen
    settings: 'Settings',
    signInToAccessSettings: 'Sign in to access settings',
    signInMessage: 'Log in to your account to manage your profile, appearance, and other settings.',
    logIn: 'Log in',
    footerText: 'Monet — Diaspora to DRC',
    paymentMethods: 'Payment methods',
    cardBankAccount: 'Card & bank account',
    fundingSources: 'Funding sources',
    noneAdded: 'None added',
    appearance: 'Appearance',
    darkMode: 'Dark mode',
    account: 'Account',
    signOut: 'Sign out',
    app: 'App',
    version: 'Version',
    successSignedOut: 'You have been signed out successfully.',

    // Profile screen
    profile: 'Profile',
    fieldName: 'Name',
    fieldEmail: 'Email',
    fieldPhone: 'Phone',
    fieldCurrency: 'Currency',
    fieldWalletId: 'Wallet ID',
    editField: 'Edit',
    editEmailMsg: 'Changing email requires re-authentication. Use your account settings or sign in again to update email.',
    errCouldNotUpdate: 'Could not update',
    profilePhoto: 'Profile photo',
    profilePhotoMsg: 'Get photo from device gallery or take a new photo.',
    takePhoto: 'Take photo',
    chooseFromGallery: 'Choose from gallery',
    removePhoto: 'Remove photo',
    permissionNeeded: 'Permission needed',
    cameraPermission: 'Camera access is required to take a photo.',
    galleryPermission: 'Gallery access is required to choose a photo.',
    photoUpdated: 'Profile photo updated.',
    errUploadPhoto: 'Could not upload photo',
    errRemovePhoto: 'Could not remove photo',
    enterValue: 'Enter value',

    // Payment methods screen
    paymentMethodsTitle: 'Payment methods',
    paymentMethodsSubtitle: 'Add a card or bank account to pay from when sending money',
    debitOrCreditCardSection: 'Debit or credit card',
    cardNumberLabel: 'Card number',
    expiryLabel: 'Expiry (MM/YY)',
    cardholderName: 'Cardholder name (optional)',
    saveCard: 'Save card',
    invalidCard: 'Invalid card',
    invalidCardMsg: 'Enter a valid card number (at least 4 digits).',
    invalidExpiry: 'Invalid expiry',
    invalidExpiryMsg: 'Enter expiry as MM/YY (e.g. 12/28).',
    cardSavedMsg: 'Card details saved securely. They are encrypted and never stored in full.',
    errSaveCard: 'Could not save card',
    bankAccountSection: 'Bank account',
    accountHolderName: 'Account holder name',
    routingNumber: 'Routing number (9 digits)',
    accountNumberLabel: 'Account number',
    saveBankAccount: 'Save bank account',
    updateBankAccount: 'Update bank account',
    updateCard: 'Update card',
    invalidRouting: 'Invalid routing number',
    invalidRoutingMsg: 'Routing number must be 9 digits.',
    invalidAccountNumber: 'Invalid account number',
    invalidAccountMsg: 'Enter a valid account number (at least 4 digits).',
    required: 'Required',
    requiredMsg: 'Enter the account holder name.',
    bankSavedMsg: 'Bank account details saved securely. They are encrypted and never stored in full.',
    errSaveBank: 'Could not save bank account',
    paymentDisclaimer: 'Payment details are encrypted and stored securely. Full card and account numbers are never stored in plain text.',

    // Withdraw screen
    transferToMobileMoney: 'Transfer to Mobile Money',
    amountUSD: 'Amount (USD)',
    provider: 'Provider',
    withdraw: 'Withdraw',
    errValidAmount: 'Enter a valid amount',
    errInsufficientBalance: 'Insufficient balance',
    errSelectProvider: 'Select a provider (M-Pesa, Airtel, or Orange)',
    successWithdrawal: 'Withdrawal initiated. Funds will be sent to your mobile money account.',
    errWithdrawal: 'Withdrawal failed',

    // Add money screen
    addMoneyTitle: 'Add money',
    addMoneySubtitleScreen: 'Fund your wallet from your bank or card',
    from: 'From',
    creditCard: 'Credit card',
    debitCard: 'Debit card',
    errCouldNotAdd: 'Could not add money',

    // Onboarding screen
    createWallet: 'Create your Monet wallet',
    createWalletSubtitle: "We'll use this to receive and send money.",
    fullName: 'Full name',
    phoneNumber: 'Phone number',
    phonePlaceholder: '+1 234 567 8900  or  +44 7911 123456',
    phoneHint: 'Include your country code (any country).',
    continue: 'Continue',
    errNamePhone: 'Name and phone number required',
    errCreateWallet: 'Could not create wallet. Check your connection and try again.',

    // Login screen
    tagline: 'Diaspora to DRC',
    emailLabel: 'Email',
    password: 'Password',
    createAccount: 'Create account',
    signIn: 'Sign in',
    emailPasswordRequired: 'Email and password required',
    authFailed: 'Auth failed',
    alreadyHaveAccount: 'Already have an account? Sign in',
    noAccount: 'No account? Sign up',
  },
  fr: {
    // Common
    cancel: 'Annuler',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    ok: 'OK',
    edit: 'Modifier',
    update: 'Mettre à jour',
    error: 'Erreur',
    success: 'Succès',
    available: 'Disponible',
    saved: 'Enregistré',

    // Tab labels
    tabWallet: 'Portefeuille',
    tabSend: 'Envoyer',
    tabActivity: 'Activité',
    tabSettings: 'Paramètres',

    // Wallet screen
    yourBalance: 'Votre solde',
    addMoney: "Ajouter de l'argent",
    addMoneySubtext: 'Depuis une banque ou carte',
    transferMobile: 'Virement vers Mobile Money',
    transferMobileSubtext: 'M-Pesa · Airtel · Orange',
    recentActivity: 'Activité récente',
    banner1Title: 'Envoyer en RDC',
    banner1Subtitle: 'Transferts rapides et peu coûteux',
    banner2Title: 'M-Pesa & Airtel',
    banner2Subtitle: 'Retrait vers mobile money',
    banner3Title: 'Votre argent, en sécurité',
    banner3Subtitle: 'Portefeuille sécurisé pour la diaspora',

    // Send screen
    sendMoney: "Envoyer de l'argent",
    sendMoneySubtitle: 'Envoyez à la famille ou aux amis en quelques secondes',
    amount: 'Montant',
    sendTo: 'Envoyer à',
    searchPlaceholder: 'Rechercher par nom ou numéro de téléphone',
    noOneFound: 'Personne trouvée. Essayez un nom ou un numéro différent.',
    noName: 'Pas de nom',
    mostSent: 'Plus envoyé',
    mostSentEmpty: "Envoyez de l'argent pour voir vos contacts les plus fréquents ici.",
    noContacts: "Pas encore de contacts. Demandez à vos amis de rejoindre Monet pour leur envoyer de l'argent.",
    payFrom: 'Payer depuis',
    walletBalance: 'Solde du portefeuille',
    debitOrCreditCard: 'Carte de débit\nou de crédit',
    bankAccount: 'Compte bancaire',
    errSelectRecipient: 'Sélectionnez un destinataire et entrez un montant valide',
    errInsufficientWallet: "Solde insuffisant. Ajoutez de l'argent ou choisissez une autre source.",
    successTransferWallet: 'Transfert effectué. Le solde du destinataire a été mis à jour.',
    successTransferExternal: 'Transfert initié. Le destinataire verra le solde à la confirmation du paiement.',
    errTransferFailed: 'Transfert échoué',
    errLoadRecipients: 'Impossible de charger les destinataires. Vérifiez votre connexion.',

    // Activity screen
    moneyInOut: 'Entrées et sorties',
    noTransactions: 'Aucune transaction pour le moment.',
    withdrawal: 'Retrait',
    received: 'Reçu',
    transfer: 'Transfert',

    // Settings screen
    settings: 'Paramètres',
    signInToAccessSettings: 'Connectez-vous pour accéder aux paramètres',
    signInMessage: 'Connectez-vous à votre compte pour gérer votre profil, apparence et autres paramètres.',
    logIn: 'Se connecter',
    footerText: 'Monet — Diaspora vers RDC',
    paymentMethods: 'Méthodes de paiement',
    cardBankAccount: 'Carte et compte bancaire',
    fundingSources: 'Sources de financement',
    noneAdded: 'Aucune ajoutée',
    appearance: 'Apparence',
    darkMode: 'Mode sombre',
    account: 'Compte',
    signOut: 'Se déconnecter',
    app: 'Application',
    version: 'Version',
    successSignedOut: 'Vous avez été déconnecté avec succès.',

    // Profile screen
    profile: 'Profil',
    fieldName: 'Nom',
    fieldEmail: 'E-mail',
    fieldPhone: 'Téléphone',
    fieldCurrency: 'Devise',
    fieldWalletId: 'ID du portefeuille',
    editField: 'Modifier',
    editEmailMsg: "La modification de l'e-mail nécessite une réauthentification. Utilisez vos paramètres de compte ou reconnectez-vous.",
    errCouldNotUpdate: 'Impossible de mettre à jour',
    profilePhoto: 'Photo de profil',
    profilePhotoMsg: 'Obtenez une photo de la galerie ou prenez une nouvelle photo.',
    takePhoto: 'Prendre une photo',
    chooseFromGallery: 'Choisir dans la galerie',
    removePhoto: 'Supprimer la photo',
    permissionNeeded: 'Permission requise',
    cameraPermission: "L'accès à la caméra est nécessaire pour prendre une photo.",
    galleryPermission: "L'accès à la galerie est nécessaire pour choisir une photo.",
    photoUpdated: 'Photo de profil mise à jour.',
    errUploadPhoto: 'Impossible de télécharger la photo',
    errRemovePhoto: 'Impossible de supprimer la photo',
    enterValue: 'Entrez une valeur',

    // Payment methods screen
    paymentMethodsTitle: 'Méthodes de paiement',
    paymentMethodsSubtitle: "Ajoutez une carte ou un compte bancaire pour payer lors de l'envoi d'argent",
    debitOrCreditCardSection: 'Carte de débit ou de crédit',
    cardNumberLabel: 'Numéro de carte',
    expiryLabel: 'Expiration (MM/AA)',
    cardholderName: 'Nom du titulaire (optionnel)',
    saveCard: 'Enregistrer la carte',
    invalidCard: 'Carte invalide',
    invalidCardMsg: 'Entrez un numéro de carte valide (au moins 4 chiffres).',
    invalidExpiry: 'Expiration invalide',
    invalidExpiryMsg: "Entrez l'expiration au format MM/AA (ex. 12/28).",
    cardSavedMsg: 'Détails de la carte enregistrés. Ils sont chiffrés et jamais stockés en intégralité.',
    errSaveCard: "Impossible d'enregistrer la carte",
    bankAccountSection: 'Compte bancaire',
    accountHolderName: 'Nom du titulaire du compte',
    routingNumber: 'Numéro de routage (9 chiffres)',
    accountNumberLabel: 'Numéro de compte',
    saveBankAccount: 'Enregistrer le compte bancaire',
    updateBankAccount: 'Mettre à jour le compte bancaire',
    updateCard: 'Mettre à jour la carte',
    invalidRouting: 'Numéro de routage invalide',
    invalidRoutingMsg: 'Le numéro de routage doit avoir 9 chiffres.',
    invalidAccountNumber: 'Numéro de compte invalide',
    invalidAccountMsg: 'Entrez un numéro de compte valide (au moins 4 chiffres).',
    required: 'Requis',
    requiredMsg: 'Entrez le nom du titulaire du compte.',
    bankSavedMsg: 'Détails du compte enregistrés. Ils sont chiffrés et jamais stockés en intégralité.',
    errSaveBank: 'Impossible d\'enregistrer le compte bancaire',
    paymentDisclaimer: 'Les détails de paiement sont chiffrés et stockés en toute sécurité. Les numéros complets de carte et de compte ne sont jamais stockés en texte brut.',

    // Withdraw screen
    transferToMobileMoney: 'Transfert vers Mobile Money',
    amountUSD: 'Montant (USD)',
    provider: 'Fournisseur',
    withdraw: 'Retirer',
    errValidAmount: 'Entrez un montant valide',
    errInsufficientBalance: 'Solde insuffisant',
    errSelectProvider: 'Sélectionnez un fournisseur (M-Pesa, Airtel ou Orange)',
    successWithdrawal: 'Retrait initié. Les fonds seront envoyés à votre compte Mobile Money.',
    errWithdrawal: 'Retrait échoué',

    // Add money screen
    addMoneyTitle: "Ajouter de l'argent",
    addMoneySubtitleScreen: 'Financer votre portefeuille depuis votre banque ou carte',
    from: 'Depuis',
    creditCard: 'Carte de crédit',
    debitCard: 'Carte de débit',
    errCouldNotAdd: "Impossible d'ajouter de l'argent",

    // Onboarding screen
    createWallet: 'Créez votre portefeuille Monet',
    createWalletSubtitle: "Nous l'utiliserons pour recevoir et envoyer de l'argent.",
    fullName: 'Nom complet',
    phoneNumber: 'Numéro de téléphone',
    phonePlaceholder: '+1 234 567 8900  ou  +44 7911 123456',
    phoneHint: 'Incluez votre indicatif pays (tout pays).',
    continue: 'Continuer',
    errNamePhone: 'Nom et numéro de téléphone requis',
    errCreateWallet: 'Impossible de créer le portefeuille. Vérifiez votre connexion et réessayez.',

    // Login screen
    tagline: 'Diaspora vers RDC',
    emailLabel: 'E-mail',
    password: 'Mot de passe',
    createAccount: 'Créer un compte',
    signIn: 'Se connecter',
    emailPasswordRequired: 'E-mail et mot de passe requis',
    authFailed: 'Authentification échouée',
    alreadyHaveAccount: 'Vous avez déjà un compte ? Se connecter',
    noAccount: "Pas de compte ? S'inscrire",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved === 'en' || saved === 'fr') setLangState(saved);
    });
  }, []);

  const setLang = (value) => {
    setLangState(value);
    AsyncStorage.setItem(LANG_KEY, value);
  };

  const toggleLang = () => setLang(lang === 'en' ? 'fr' : 'en');

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
