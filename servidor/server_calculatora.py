from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)  # Permite peticiones desde cualquier origen

# Configuración de la base de datos
DATABASE = 'calculator_operations.db'

def init_db():
    """Inicializa la base de datos con la tabla de operaciones"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS operations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mode TEXT NOT NULL,
            operand1 TEXT NOT NULL,
            operand2 TEXT,
            operation TEXT NOT NULL,
            result TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def save_operation(mode, operand1, operand2, operation, result):
    """Guarda una operación en la base de datos"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO operations (mode, operand1, operand2, operation, result)
        VALUES (?, ?, ?, ?, ?)
    ''', (mode, str(operand1), str(operand2) if operand2 is not None else None, operation, str(result)))
    
    conn.commit()
    operation_id = cursor.lastrowid
    conn.close()
    return operation_id

@app.route('/api/operation', methods=['POST'])
def add_operation():
    """Endpoint para recibir y guardar operaciones"""
    try:
        data = request.get_json()
        
        # Validar que los datos requeridos estén presentes
        required_fields = ['mode', 'operand1', 'operation', 'result']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo requerido faltante: {field}'}), 400
        
        # Extraer datos del JSON
        mode = data['mode']
        operand1 = data['operand1']
        operand2 = data.get('operand2')  # Puede ser None para operaciones unarias
        operation = data['operation']
        result = data['result']
        
        # Validar modo
        valid_modes = ['xiquet', 'basic', 'advanced', 'programmer']
        if mode not in valid_modes:
            return jsonify({'error': f'Modo inválido. Debe ser uno de: {valid_modes}'}), 400
        
        # Guardar en la base de datos
        operation_id = save_operation(mode, operand1, operand2, operation, result)
        
        return jsonify({
            'success': True,
            'message': 'Operación guardada correctamente',
            'operation_id': operation_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/operations', methods=['GET'])
def get_operations():
    """Endpoint para obtener todas las operaciones guardadas"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, mode, operand1, operand2, operation, result, timestamp
            FROM operations
            ORDER BY timestamp DESC
        ''')
        
        operations = []
        for row in cursor.fetchall():
            operations.append({
                'id': row[0],
                'mode': row[1],
                'operand1': row[2],
                'operand2': row[3],
                'operation': row[4],
                'result': row[5],
                'timestamp': row[6]
            })
        
        conn.close()
        return jsonify({'operations': operations}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/operations/mode/<mode>', methods=['GET'])
def get_operations_by_mode(mode):
    """Endpoint para obtener operaciones filtradas por modo"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, mode, operand1, operand2, operation, result, timestamp
            FROM operations
            WHERE mode = ?
            ORDER BY timestamp DESC
        ''', (mode,))
        
        operations = []
        for row in cursor.fetchall():
            operations.append({
                'id': row[0],
                'mode': row[1],
                'operand1': row[2],
                'operand2': row[3],
                'operation': row[4],
                'result': row[5],
                'timestamp': row[6]
            })
        
        conn.close()
        return jsonify({'operations': operations, 'mode': mode}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Endpoint para obtener estadísticas de uso"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        # Contar operaciones por modo
        cursor.execute('''
            SELECT mode, COUNT(*) as count
            FROM operations
            GROUP BY mode
        ''')
        
        mode_stats = {}
        for row in cursor.fetchall():
            mode_stats[row[0]] = row[1]
        
        # Contar operaciones por tipo de operación
        cursor.execute('''
            SELECT operation, COUNT(*) as count
            FROM operations
            GROUP BY operation
            ORDER BY count DESC
            LIMIT 10
        ''')
        
        operation_stats = {}
        for row in cursor.fetchall():
            operation_stats[row[0]] = row[1]
        
        # Contar total de operaciones
        cursor.execute('SELECT COUNT(*) FROM operations')
        total_operations = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'total_operations': total_operations,
            'operations_by_mode': mode_stats,
            'most_used_operations': operation_stats
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/', methods=['GET'])
def home():
    """Endpoint raíz con información de la API"""
    return jsonify({
        'message': 'API de Calculadora',
        'endpoints': {
            'POST /api/operation': 'Guardar una operación',
            'GET /api/operations': 'Obtener todas las operaciones',
            'GET /api/operations/mode/<mode>': 'Obtener operaciones por modo',
            'GET /api/stats': 'Obtener estadísticas de uso'
        }
    })

if __name__ == '__main__':
    # Inicializar la base de datos
    init_db()
    
    # Ejecutar el servidor
    print("Iniciando servidor de calculadora...")
    print("Base de datos:", os.path.abspath(DATABASE))
    app.run(debug=True, host='0.0.0.0', port=5000)
