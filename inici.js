// Pàgina d'inici: obri la calculadora en una finestra pròpia amb el tamany adequat (BOM).
// Cal una pàgina a banda perquè el navegador no permet redimensionar una finestra
// oberta per l'usuari, només les obertes per codi amb window.open().

// Tamany de la finestra (ajustat al mode Avançat, que és el més alt)
const AMPLADA = 500;
const ALTURA = 900;

document.getElementById('obrir').addEventListener('click', () => {
    // L'objecte screen (BOM) dóna la mida de la pantalla sense la barra de tasques:
    // amb això calculem la posició per a centrar la finestra
    const left = Math.round((screen.availWidth - AMPLADA) / 2);
    const top = Math.round((screen.availHeight - ALTURA) / 2);

    // El segon paràmetre és el NOM de la finestra: si es torna a polsar el botó,
    // es reutilitza la mateixa en lloc d'obrir-ne una altra
    const finestra = window.open(
        'calculatora.html',
        'calculadora',
        `width=${AMPLADA},height=${ALTURA},left=${left},top=${top},resizable=yes`
    );

    // window.open() torna null si el navegador ha bloquejat la finestra emergent
    if (finestra) {
        finestra.focus();
        document.getElementById('avis').textContent = '';
    } else {
        document.getElementById('avis').textContent =
            'El navegador ha bloquejat la finestra. Permet les finestres emergents per a aquesta pàgina.';
    }
});
