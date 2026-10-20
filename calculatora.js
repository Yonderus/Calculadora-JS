/*
 * JAVIER GISBERT TALBOOM 2DAW
 * CALCULADORA MULTIMODE
 * Modes: xiquet, bàsic, avançat, programador i historial.
 * Cada operació es desa en localStorage (còpia local) i s'envia al servidor Flask.
 */

// Traducció de l'operació interna al símbol que es mostra en pantalla
const SIMBOLS = {
    '+': '+', '-': '−', '*': '×', '/': '÷', 'pow': '^',
    'and': 'AND', 'or': 'OR', 'xor': 'XOR'
};

class Calculadora {
    constructor() {
        this.valorActual = '0';        // nombre que es veu en pantalla
        this.valorAnterior = '';       // primer operand, guardat en polsar l'operador
        this.operacio = null;          // operació pendent ('+', '*', 'and'...)
        this.reiniciarPantalla = false; // si el següent dígit ha de substituir la pantalla
        this.modeActual = 'basic';
        this.baseActual = 10;          // base del mode programador (2, 8, 10 o 16)
        this.historial = '';           // text de l'operació en curs ("5 +")

        this.inicialitzar();
    }

    SERVER_URL = 'http://localhost:5000';

    // Desa l'operació en local i l'envia al servidor
    async sendOperationToServer(operationData) {
        // Els errors no es desen enlloc
        if (operationData.result === 'Error') return false;

        // Primer en local: així no es perd res encara que el servidor estiga apagat
        this.guardarOperacionLocal(operationData);

        try {
            const response = await fetch(`${this.SERVER_URL}/api/operation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(operationData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showStatus(`Operación guardada correctamente (ID: ${result.operation_id})`, 'success');
                return true;
            } else {
                this.showStatus(`Error al guardar: ${result.error}`, 'error');
                return false;
            }
        } catch (error) {
            this.showStatus(`Error de conexión: ${error.message}`, 'error');
            return false;
        }
    }

    // Afig l'operació a l'array desat en localStorage: llegir → convertir → afegir → desar
    guardarOperacionLocal(operationData) {
        const text = localStorage.getItem('operacions');

        // localStorage només guarda text, cal convertir-lo a array amb JSON.parse
        let operacions;
        if (text === null) {
            operacions = [];
        } else {
            operacions = JSON.parse(text);
        }

        // Els tres punts (spread) copien tots els camps d'operationData i hi afegim la data,
        // sense modificar l'objecte original que després s'envia al servidor
        operacions.push({ ...operationData, data: new Date().toLocaleString() });

        localStorage.setItem('operacions', JSON.stringify(operacions));
    }

    // Demana les operacions al servidor; si no respon, usa la còpia de localStorage
    async carregarHistorial() {
        const origen = document.getElementById('historialOrigen');
        let operacions;

        try {
            const resposta = await fetch(`${this.SERVER_URL}/api/operations`);
            if (!resposta.ok) throw new Error('Resposta incorrecta del servidor');
            const dades = await resposta.json();
            operacions = dades.operations;
            origen.textContent = 'Origen: servidor';
        } catch (error) {
            // El servidor no està disponible: pla B amb les dades locals
            const text = localStorage.getItem('operacions');
            // .reverse() per a mostrar-les de la més nova a la més antiga, com fa el servidor
            operacions = text === null ? [] : JSON.parse(text).reverse();
            origen.textContent = 'Origen: local (servidor no disponible)';
        }

        this.mostrarHistorial(operacions);
    }

    // Pinta la llista d'operacions dins del <ul> del mode historial
    mostrarHistorial(operacions) {
        const llista = document.getElementById('llistaHistorial');
        llista.textContent = ''; // buidar abans de pintar, si no s'acumularien duplicats

        if (operacions.length === 0) {
            const buit = document.createElement('li');
            buit.className = 'historial-buit';
            buit.textContent = 'Encara no hi ha operacions';
            llista.appendChild(buit);
            return;
        }

        operacions.forEach(op => {
            const li = document.createElement('li');
            li.className = 'historial-item';

            const simbol = SIMBOLS[op.operation] || op.operation;

            const operacio = document.createElement('div');
            operacio.className = 'historial-operacio';
            // Sense operand2 és una operació d'un sol nombre: sin(30) = 0.5
            operacio.textContent = op.operand2 === null || op.operand2 === undefined
                ? `${simbol}(${op.operand1}) = ${op.result}`
                : `${op.operand1} ${simbol} ${op.operand2} = ${op.result}`;

            const info = document.createElement('div');
            info.className = 'historial-info';
            // timestamp ve del servidor; data, de localStorage
            info.textContent = `${op.mode} · ${op.timestamp || op.data}`;

            li.appendChild(operacio);
            li.appendChild(info);
            llista.appendChild(li);
        });
    }

    // Mostra un avís (verd o roig) davall de la pantalla durant 5 segons
    showStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;

        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }, 5000);
    }

    // Enllaça els botons de mode i de base, i activa el suport per teclat
    inicialitzar() {
        // Event listeners per canviar de mode
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.canviarMode(e.target.dataset.mode);
            });
        });

        // Event listeners per canviar de base
        document.querySelectorAll('.base-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.canviarBase(parseInt(e.target.dataset.base));
            });
        });

        // Suport per teclat
        document.addEventListener('keydown', (e) => this.gestionarTeclat(e));
    }

    // Amaga tots els modes i mostra només el seleccionat
    canviarMode(mode) {
        // Actualitzar botons de mode
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

        // Amagar tots els modes
        document.getElementById('historialMode').classList.add('hidden');
        document.getElementById('xiquetMode').classList.add('hidden');
        document.getElementById('basicMode').classList.add('hidden');
        document.getElementById('advancedMode').classList.add('hidden');
        document.getElementById('programmerMode').classList.add('hidden');
        document.getElementById('baseSelector').classList.add('hidden');

        // Mostrar el mode seleccionat
        if (mode === 'historial') {
            document.getElementById('historialMode').classList.remove('hidden');
            this.carregarHistorial(); // es recarrega cada vegada que s'hi entra
        } else if (mode === 'xiquet') {
            document.getElementById('xiquetMode').classList.remove('hidden');
        } else if (mode === 'basic') {
            document.getElementById('basicMode').classList.remove('hidden');
        } else if (mode === 'advanced') {
            document.getElementById('advancedMode').classList.remove('hidden');
        } else if (mode === 'programmer') {
            document.getElementById('programmerMode').classList.remove('hidden');
            document.getElementById('baseSelector').classList.remove('hidden');
        }

        this.modeActual = mode;
        this.netejar();
    }

    // Canvia la base del mode programador i converteix el valor que hi ha en pantalla
    canviarBase(base) {
        // Convertir el valor actual a la nova base
        let valorDecimal = parseInt(this.valorActual, this.baseActual);
        if (!isNaN(valorDecimal)) {
            this.valorActual = valorDecimal.toString(base).toUpperCase();
            this.actualitzarPantalla();
        }

        // Actualitzar botons de base
        document.querySelectorAll('.base-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-base="${base}"]`).classList.add('active');

        this.baseActual = base;

        // Deshabilitar botons segons la base
        this.actualitzarBotonsPerBase();
    }

    // Atenua els botons de dígits que no existeixen en la base activa (p. ex. la A en BIN)
    actualitzarBotonsPerBase() {
        const digitsValids = {
            2: ['0', '1'],
            8: ['0', '1', '2', '3', '4', '5', '6', '7'],
            10: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            16: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F']
        };

        if (this.modeActual === 'programmer') {
            const buttons = document.querySelectorAll('#programmerMode .btn-number, #programmerMode .btn-hex');
            buttons.forEach(btn => {
                const digit = btn.textContent.trim();
                if (digitsValids[this.baseActual].includes(digit)) {
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'auto';
                } else {
                    btn.style.opacity = '0.3';
                    btn.style.pointerEvents = 'none';
                }
            });
        }
    }

    // Afig un dígit a la pantalla, validant la base i el límit de dígits del mode
    afegirNombre(num) {
        // Validar segons la base actual
        if (this.modeActual === 'programmer') {
            const digitsValids = {
                2: ['0', '1'],
                8: ['0', '1', '2', '3', '4', '5', '6', '7'],
                10: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
                16: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F']
            };

            if (!digitsValids[this.baseActual].includes(num)) {
                return;
            }
        }

        // Comença un nombre nou si ve d'un resultat o si en pantalla només hi ha un 0
        if (this.reiniciarPantalla || this.valorActual === '0') {
            this.valorActual = '';
            this.reiniciarPantalla = false;
        }

        // El mode xiquet està limitat a 3 dígits per operand
        const maxDigits = this.modeActual === 'xiquet' ? 3 : 16;

        if (this.valorActual.length < maxDigits) {
            this.valorActual += num;
            this.actualitzarPantalla();
        }
    }

    // Afig el punt decimal (no disponible en programador ni en xiquet)
    decimal() {
        if (this.modeActual === 'programmer' || this.modeActual === 'xiquet') return;

        if (this.reiniciarPantalla) {
            this.valorActual = '0';
            this.reiniciarPantalla = false;
        }

        // Només un punt per nombre
        if (!this.valorActual.includes('.')) {
            this.valorActual += '.';
            this.actualitzarPantalla();
        }
    }

    // Reinicia la calculadora (botó C)
    netejar() {
        this.valorActual = '0';
        this.valorAnterior = '';
        this.operacio = null;
        this.reiniciarPantalla = false;
        this.historial = '';
        this.actualitzarPantalla();
    }

    // Guarda l'operació pendent i el primer operand
    establirOperador(op) {
        if (this.valorActual === 'Error') return;
        // En mode xiquet només es permeten la suma i la resta
        if (this.modeActual === 'xiquet' && op !== '+' && op !== '-') return;

        // Si ja hi havia una operació pendent, es resol abans (encadenar: 2+3+4)
        if (this.operacio !== null && !this.reiniciarPantalla) {
            this.calcular();
        }

        this.valorAnterior = this.valorActual;
        this.operacio = op;
        this.reiniciarPantalla = true;

        const simbolOperador = SIMBOLS[op] || op;
        this.historial = `${this.valorActual} ${simbolOperador}`;
        this.actualitzarPantalla();
    }

    // Resol l'operació pendent entre dos operands (botó =)
    calcular() {
        if (this.operacio === null || this.valorAnterior === '') return;

        // Es copien els valors abans de calcular, perquè després es modifiquen
        const op1 = this.valorAnterior;
        const op2 = this.valorActual;
        const operacio = this.operacio;

        let resultat;
        // En programador els nombres es llegeixen en la base activa i sense decimals
        const anterior = this.modeActual === 'programmer'
            ? parseInt(this.valorAnterior, this.baseActual)
            : parseFloat(this.valorAnterior);
        const actual = this.modeActual === 'programmer'
            ? parseInt(this.valorActual, this.baseActual)
            : parseFloat(this.valorActual);

        switch (this.operacio) {
            case '+': resultat = anterior + actual; break;
            case '-': resultat = anterior - actual; break;
            case '*': resultat = anterior * actual; break;
            case '/':
                // Dividir entre 0 donaria Infinity, per això es comprova abans
                if (actual === 0) {
                    resultat = 'Error';
                } else {
                    resultat = anterior / actual;
                }
                break;
            case 'pow': resultat = Math.pow(anterior, actual); break;
            // &, | i ^ són els operadors bit a bit (no confondre amb && i ||)
            case 'and': resultat = anterior & actual; break;
            case 'or': resultat = anterior | actual; break;
            case 'xor': resultat = anterior ^ actual; break;
        }

        // Qualsevol NaN o Infinity que s'haja escapat es tracta com a error
        if (!Number.isFinite(resultat)) {
            resultat = 'Error';
        }

        if (resultat === 'Error') {
            this.valorActual = 'Error';
        } else {
            if (this.modeActual === 'programmer') {
                resultat = Math.floor(resultat);
                this.valorActual = resultat.toString(this.baseActual).toUpperCase();
            } else {
                this.valorActual = resultat.toString();
            }
            // Mostra l'operació completa damunt de la pantalla: 6 × 7 = 42
            document.getElementById('previ').textContent = `${op1} ${SIMBOLS[operacio]} ${op2} = ${this.valorActual}`;
        }

        const operationData = {
            mode: this.modeActual,
            operand1: op1,
            operand2: op2,
            operation: operacio,
            result: this.valorActual
        };
        this.sendOperationToServer(operationData);

        this.operacio = null;
        this.valorAnterior = '';
        this.reiniciarPantalla = true;
        this.historial = '';
        this.actualitzarPantalla();
    }

    // Canvia el signe del nombre en pantalla (botó +/-)
    canviarSigne() {
        if (this.modeActual === 'programmer') return;

        if (this.valorActual !== '0') {
            if (this.valorActual.startsWith('-')) {
                this.valorActual = this.valorActual.slice(1);
            } else {
                this.valorActual = '-' + this.valorActual;
            }
            this.actualitzarPantalla();
        }
    }

    // Divideix per 100 el nombre en pantalla (botó %)
    percentatge() {
        if (this.modeActual === 'programmer') return;

        const op1 = this.valorActual;
        this.valorActual = (parseFloat(this.valorActual) / 100).toString();

        // operand2 és null perquè és una operació d'un sol nombre
        const operationData = {
            mode: this.modeActual,
            operand1: op1,
            operand2: null,
            operation: '%',
            result: this.valorActual
        };
        this.sendOperationToServer(operationData);
        this.reiniciarPantalla = true;
        this.actualitzarPantalla();
    }

    // Funcions del mode avançat: trigonometria, logaritmes, arrel i exponencial
    funcioCientifica(func) {
        const valor = parseFloat(this.valorActual);
        const op1 = this.valorActual;
        let resultat;

        switch (func) {
            // Math treballa en radians, per això es multiplica per PI/180
            case 'sin': resultat = Math.sin(valor * Math.PI / 180); break;
            case 'cos': resultat = Math.cos(valor * Math.PI / 180); break;
            case 'tan': resultat = Math.tan(valor * Math.PI / 180); break;
            case 'ln': resultat = Math.log(valor); break;    // Math.log és el neperià
            case 'log': resultat = Math.log10(valor); break; // Math.log10 és el de base 10
            case 'sqrt': resultat = Math.sqrt(valor); break;
            case 'exp': resultat = Math.exp(valor); break;
        }

        // Cobreix l'arrel d'un negatiu (NaN) i el logaritme de 0 (-Infinity)
        if (!Number.isFinite(resultat)) {
            resultat = 'Error';
        }

        this.valorActual = resultat.toString();

        const operationData = {
            mode: this.modeActual,
            operand1: op1,
            operand2: null,
            operation: func,
            result: this.valorActual
        };
        this.sendOperationToServer(operationData);

        this.reiniciarPantalla = true;
        this.actualitzarPantalla();
    }

    // Factorial del nombre en pantalla (botó n!)
    factorial() {
        const op1 = this.valorActual;
        let n = parseInt(this.valorActual);
        if (n < 0) {
            this.valorActual = 'Error';
        } else if (n === 0 || n === 1) {
            this.valorActual = '1';
        } else {
            // Multiplica de 2 fins a n: 5! = 2*3*4*5
            let resultat = 1;
            for (let i = 2; i <= n; i++) {
                resultat *= i;
            }
            this.valorActual = resultat.toString();
        }

        const operationData = {
            mode: this.modeActual,
            operand1: op1,
            operand2: null,
            operation: 'factorial',
            result: this.valorActual
        };
        this.sendOperationToServer(operationData);

        this.reiniciarPantalla = true;
        this.actualitzarPantalla();
    }

    // Escriu el nombre PI en pantalla
    pi() {
        this.valorActual = Math.PI.toString();
        this.reiniciarPantalla = true;
        this.actualitzarPantalla();
    }

    // Escriu el nombre e en pantalla
    e() {
        this.valorActual = Math.E.toString();
        this.reiniciarPantalla = true;
        this.actualitzarPantalla();
    }

    // Operacions bit a bit d'un sol operand: NOT, << i >>
    operacioBitwiseUnaria(op) {
        if (this.modeActual !== 'programmer') return;
        const valor = parseInt(this.valorActual, this.baseActual);
        const op1 = this.valorActual;
        let resultat;

        switch (op) {
            case 'not': resultat = ~valor; break;      // inverteix tots els bits
            case 'lshift': resultat = valor << 1; break; // desplaça els bits a l'esquerra (×2)
            case 'rshift': resultat = valor >> 1; break; // desplaça els bits a la dreta (÷2)
        }

        if (resultat !== undefined) {
            // >>> 0 converteix el resultat a enter sense signe (el NOT dóna negatius)
            this.valorActual = (resultat >>> 0).toString(this.baseActual).toUpperCase();

            const operationData = {
                mode: this.modeActual,
                operand1: op1,
                operand2: null,
                operation: op,
                result: this.valorActual
            };
            this.sendOperationToServer(operationData);

            this.reiniciarPantalla = true;
            this.actualitzarPantalla();
        }
    }

    // Permet usar la calculadora amb el teclat
    gestionarTeclat(e) {
        // En el mode historial el teclat no ha de fer res
        if (this.modeActual === 'historial') return;

        if (e.key >= '0' && e.key <= '9') {
            this.afegirNombre(e.key);
        } else if (e.key === '.') {
            this.decimal();
        } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
            this.establirOperador(e.key);
        } else if (e.key === 'Enter' || e.key === '=') {
            this.calcular();
        } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
            this.netejar();
        } else if (e.key === 'Backspace') {
            // Esborra l'últim dígit; si només en queda un, torna a 0
            if (this.valorActual.length > 1) {
                this.valorActual = this.valorActual.slice(0, -1);
            } else {
                this.valorActual = '0';
            }
            this.actualitzarPantalla();
        }
    }

    // Bolca el valor actual i l'operació en curs als divs de la pantalla
    actualitzarPantalla() {
        const display = document.getElementById('display');
        const historial = document.getElementById('historial');

        let valorPantalla = this.valorActual;
        // Els nombres molt llargs es mostren en notació científica perquè càpiguen
        if (this.modeActual !== 'programmer' && !isNaN(parseFloat(valorPantalla)) && valorPantalla.length > 10) {
            try {
                valorPantalla = parseFloat(valorPantalla).toExponential(8);
            } catch (e) {
                // no fer res si no es pot convertir
            }
        }
        display.textContent = valorPantalla;
        historial.textContent = this.historial;
    }
}

// Inicialitzar la calculadora
const calc = new Calculadora();
