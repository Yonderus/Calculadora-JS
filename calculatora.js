const SIMBOLS = {
    '+': '+', '-': '−', '*': '×', '/': '÷', 'pow': '^',
    'and': 'AND', 'or': 'OR', 'xor': 'XOR'
};

class Calculadora {
    constructor() {
        this.valorActual = '0';
        this.valorAnterior = '';
        this.operacio = null;
        this.reiniciarPantalla = false;
        this.modeActual = 'basic';
        this.baseActual = 10;
        this.historial = '';
        
        this.inicialitzar();
    }

    SERVER_URL = 'http://localhost:5000';

    // Función para enviar operación al servidor
    async sendOperationToServer(operationData) {

        if (operationData.result === 'Error') return false;
        
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
        };
    };

    guardarOperacionLocal(operationData) {
        const text = localStorage.getItem('operacions');
        let operacions;
        if (text === null) {
            operacions = [];
        } else {
            operacions = JSON.parse(text);
        }

        operacions.push({ ...operationData, data: new Date().toLocaleString() });

        localStorage.setItem('operacions', JSON.stringify(operacions));
    }

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
            const text = localStorage.getItem('operacions');
            operacions = text === null ? [] : JSON.parse(text).reverse();
            origen.textContent = 'Origen: local (servidor no disponible)';
        }

        this.mostrarHistorial(operacions);
    }

    mostrarHistorial(operacions) {
        const llista = document.getElementById('llistaHistorial');
        llista.textContent = '';

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
            operacio.textContent = op.operand2 === null || op.operand2 === undefined
                ? `${simbol}(${op.operand1}) = ${op.result}`
                : `${op.operand1} ${simbol} ${op.operand2} = ${op.result}`;

            const info = document.createElement('div');
            info.className = 'historial-info';
            info.textContent = `${op.mode} · ${op.timestamp || op.data}`;

            li.appendChild(operacio);
            li.appendChild(info);
            llista.appendChild(li);
        });
    }

    // Función para mostrar estados
    showStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        
        // Limpiar el estado después de 5 segundos
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }, 5000);
    }; 

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
            this.carregarHistorial();
        }else if (mode === 'xiquet') {
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

        if (this.reiniciarPantalla || this.valorActual === '0') {
            this.valorActual = '';
            this.reiniciarPantalla = false;
        }

        const maxDigits = this.modeActual === 'xiquet' ? 3 : 16;
        
        if (this.valorActual.length < maxDigits) {
            this.valorActual += num;
            this.actualitzarPantalla();
        }
    }

    decimal() {
        if (this.modeActual === 'programmer' || this.modeActual === 'xiquet') return;
        
        if (this.reiniciarPantalla) {
            this.valorActual = '0';
            this.reiniciarPantalla = false;
        }
        
        if (!this.valorActual.includes('.')) {
            this.valorActual += '.';
            this.actualitzarPantalla();
        }
    }

    netejar() {
        this.valorActual = '0';
        this.valorAnterior = '';
        this.operacio = null;
        this.reiniciarPantalla = false;
        this.historial = '';
        this.actualitzarPantalla();
    }

    establirOperador(op) {
        if (this.valorActual === 'Error') return;
        if (this.modeActual === 'xiquet' && op !== '+' && op !== '-') return;

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

    calcular() {
        if (this.operacio === null || this.valorAnterior === '') return;
        
        const op1 = this.valorAnterior;
        const op2 = this.valorActual;
        const operacio = this.operacio;

        let resultat;
        const anterior = this.modeActual === 'programmer' 
            ? parseInt(this.valorAnterior, this.baseActual)
            : parseFloat(this.valorAnterior);
        const actual = this.modeActual === 'programmer'
            ? parseInt(this.valorActual, this.baseActual)
            : parseFloat(this.valorActual);
        
        switch(this.operacio) {
            case '+': resultat = anterior + actual; break;
            case '-': resultat = anterior - actual; break;
            case '*': resultat = anterior * actual; break;
            case '/': 
            if (actual === 0) {
                this.valorActual = 'Error';
            } else {
                resultat = anterior / actual;
            }
                        
            break;
            case 'pow': resultat = Math.pow(anterior, actual); break;
            case 'and': resultat = anterior & actual; break;
            case 'or': resultat = anterior | actual; break;
            case 'xor': resultat = anterior ^ actual; break; 
        }

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

    percentatge() {
        if (this.modeActual === 'programmer') return;
        
        const op1 = this.valorActual;
        this.valorActual = (parseFloat(this.valorActual) / 100).toString();

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

    funcioCientifica(func) {
        const valor = parseFloat(this.valorActual);
        const op1 = this.valorActual;
        let resultat;
        
        switch(func) {
            case 'sin': resultat = Math.sin(valor * Math.PI / 180); break;
            case 'cos': resultat = Math.cos(valor * Math.PI / 180); break;
            case 'tan': resultat = Math.tan(valor * Math.PI / 180); break;
            case 'ln': resultat = Math.log(valor); break;
            case 'log': resultat = Math.log10(valor); break;
            case 'sqrt': resultat = Math.sqrt(valor); break;
            case 'exp': resultat = Math.exp(valor); break;
        }

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

    factorial() {
        const op1 = this.valorActual;
        let n = parseInt(this.valorActual);
        if (n < 0) {
            this.valorActual = 'Error';
        } else if (n === 0 || n === 1) {
            this.valorActual = '1';
        } else {
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

    pi() {
        this.valorActual = Math.PI.toString();
        this.reiniciarPantalla = true;
        this.actualitzarPantalla();
    }

    e() {
        this.valorActual = Math.E.toString();
        this.reiniciarPantalla = true;
        this.actualitzarPantalla();
    }

    operacioBitwiseUnaria(op) {
        if (this.modeActual !== 'programmer') return;
        const valor = parseInt(this.valorActual, this.baseActual);
        const op1 = this.valorActual;
        let resultat;
        
        switch(op) {
            case 'not': resultat = ~valor; break;
            case 'lshift': resultat = valor << 1; break;
            case 'rshift': resultat = valor >> 1; break;
        }
        
        if (resultat !== undefined) {
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

    gestionarTeclat(e) {
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
            if (this.valorActual.length > 1) {
                this.valorActual = this.valorActual.slice(0, -1);
            } else {
                this.valorActual = '0';
            }
            this.actualitzarPantalla();
        }
    }

    actualitzarPantalla() {
        const display = document.getElementById('display');
        const historial = document.getElementById('historial');
        
        let valorPantalla = this.valorActual;
        if (this.modeActual !== 'programmer' && !isNaN(parseFloat(valorPantalla)) && valorPantalla.length > 10) {
            try {
                valorPantalla = parseFloat(valorPantalla).toExponential(8);
            } catch(e) {
                // no fer res si no es pot convertir
            }
        }
        display.textContent = valorPantalla;
        historial.textContent = this.historial;
    }
}

// Inicialitzar la calculadora
const calc = new Calculadora();
