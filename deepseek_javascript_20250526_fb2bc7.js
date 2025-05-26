document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let gastos = JSON.parse(localStorage.getItem('gastos')) || [];
    let categoriaChart = null;
    
    // Elementos del DOM
    const gastoForm = document.getElementById('gastoForm');
    const listaGastos = document.getElementById('listaGastos');
    const totalGastadoElement = document.getElementById('totalGastado');
    const gastoPromedioElement = document.getElementById('gastoPromedio');
    const totalRegistrosElement = document.getElementById('totalRegistros');
    const filtroCategoria = document.getElementById('filtroCategoria');
    const filtroMes = document.getElementById('filtroMes');
    const aplicarFiltrosBtn = document.getElementById('aplicarFiltros');
    const exportarDatosBtn = document.getElementById('exportarDatos');
    const editarGastoModal = new bootstrap.Modal(document.getElementById('editarGastoModal'));
    
    // Inicializar la aplicación
    init();
    
    // Función de inicialización
    function init() {
        // Configurar fecha actual por defecto
        document.getElementById('fecha').valueAsDate = new Date();
        
        // Cargar gastos
        actualizarListaGastos();
        actualizarResumen();
        actualizarGrafico();
        
        // Event listeners
        gastoForm.addEventListener('submit', agregarGasto);
        aplicarFiltrosBtn.addEventListener('click', actualizarListaGastos);
        exportarDatosBtn.addEventListener('click', exportarACSV);
        document.getElementById('guardarCambios').addEventListener('click', guardarGastoEditado);
    }
    
    // Función para agregar un nuevo gasto
    function agregarGasto(e) {
        e.preventDefault();
        
        const descripcion = document.getElementById('descripcion').value;
        const monto = parseFloat(document.getElementById('monto').value);
        const categoria = document.getElementById('categoria').value;
        const fecha = document.getElementById('fecha').value;
        
        const nuevoGasto = {
            id: Date.now(),
            descripcion,
            monto,
            categoria,
            fecha
        };
        
        gastos.push(nuevoGasto);
        guardarGastos();
        
        // Limpiar el formulario
        gastoForm.reset();
        document.getElementById('fecha').valueAsDate = new Date();
        
        // Actualizar la UI
        actualizarListaGastos();
        actualizarResumen();
        actualizarGrafico();
    }
    
    // Función para guardar los gastos en localStorage
    function guardarGastos() {
        localStorage.setItem('gastos', JSON.stringify(gastos));
    }
    
    // Función para actualizar la lista de gastos
    function actualizarListaGastos() {
        // Obtener valores de los filtros
        const categoriaFiltro = filtroCategoria.value;
        const mesFiltro = filtroMes.value;
        
        // Filtrar gastos
        let gastosFiltrados = [...gastos];
        
        if (categoriaFiltro) {
            gastosFiltrados = gastosFiltrados.filter(gasto => gasto.categoria === categoriaFiltro);
        }
        
        if (mesFiltro) {
            gastosFiltrados = gastosFiltrados.filter(gasto => {
                const fechaGasto = new Date(gasto.fecha);
                return (fechaGasto.getMonth() + 1).toString() === mesFiltro;
            });
        }
        
        // Ordenar por fecha (más reciente primero)
        gastosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        // Mostrar gastos
        listaGastos.innerHTML = '';
        
        if (gastosFiltrados.length === 0) {
            listaGastos.innerHTML = '<tr><td colspan="5" class="text-center py-4">No hay gastos registrados</td></tr>';
            totalRegistrosElement.textContent = '0 gastos';
            return;
        }
        
        gastosFiltrados.forEach(gasto => {
            const fecha = new Date(gasto.fecha);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${gasto.descripcion}</td>
                <td>$${gasto.monto.toFixed(2)}</td>
                <td><span class="badge bg-primary">${gasto.categoria}</span></td>
                <td>${fechaFormateada}</td>
                <td>
                    <button class="btn btn-sm btn-warning editar-btn" data-id="${gasto.id}">Editar</button>
                    <button class="btn btn-sm btn-danger eliminar-btn" data-id="${gasto.id}">Eliminar</button>
                </td>
            `;
            
            listaGastos.appendChild(fila);
        });
        
        // Actualizar contador
        totalRegistrosElement.textContent = `${gastosFiltrados.length} ${gastosFiltrados.length === 1 ? 'gasto' : 'gastos'}`;
        
        // Agregar event listeners a los botones de editar y eliminar
        document.querySelectorAll('.editar-btn').forEach(btn => {
            btn.addEventListener('click', cargarGastoParaEditar);
        });
        
        document.querySelectorAll('.eliminar-btn').forEach(btn => {
            btn.addEventListener('click', eliminarGasto);
        });
    }
    
    // Función para actualizar el resumen de gastos
    function actualizarResumen() {
        if (gastos.length === 0) {
            totalGastadoElement.textContent = '$0.00';
            gastoPromedioElement.textContent = '$0.00';
            return;
        }
        
        const total = gastos.reduce((sum, gasto) => sum + gasto.monto, 0);
        const promedio = total / gastos.length;
        
        totalGastadoElement.textContent = `$${total.toFixed(2)}`;
        gastoPromedioElement.textContent = `$${promedio.toFixed(2)}`;
    }
    
    // Función para actualizar el gráfico de categorías
    function actualizarGrafico() {
        const ctx = document.getElementById('categoriaChart').getContext('2d');
        
        // Agrupar gastos por categoría
        const gastosPorCategoria = {};
        gastos.forEach(gasto => {
            if (!gastosPorCategoria[gasto.categoria]) {
                gastosPorCategoria[gasto.categoria] = 0;
            }
            gastosPorCategoria[gasto.categoria] += gasto.monto;
        });
        
        const categorias = Object.keys(gastosPorCategoria);
        const montos = Object.values(gastosPorCategoria);
        
        // Colores para las categorías
        const colores = [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(199, 199, 199, 0.7)'
        ];
        
        // Destruir el gráfico anterior si existe
        if (categoriaChart) {
            categoriaChart.destroy();
        }
        
        // Crear nuevo gráfico
        categoriaChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categorias,
                datasets: [{
                    data: montos,
                    backgroundColor: colores,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Función para cargar un gasto en el modal de edición
    function cargarGastoParaEditar(e) {
        const id = parseInt(e.target.getAttribute('data-id'));
        const gasto = gastos.find(g => g.id === id);
        
        if (gasto) {
            document.getElementById('editarId').value = gasto.id;
            document.getElementById('editarDescripcion').value = gasto.descripcion;
            document.getElementById('editarMonto').value = gasto.monto;
            document.getElementById('editarCategoria').value = gasto.categoria;
            document.getElementById('editarFecha').value = gasto.fecha;
            
            editarGastoModal.show();
        }
    }
    
    // Función para guardar los cambios de un gasto editado
    function guardarGastoEditado() {
        const id = parseInt(document.getElementById('editarId').value);
        const descripcion = document.getElementById('editarDescripcion').value;
        const monto = parseFloat(document.getElementById('editarMonto').value);
        const categoria = document.getElementById('editarCategoria').value;
        const fecha = document.getElementById('editarFecha').value;
        
        const index = gastos.findIndex(g => g.id === id);
        
        if (index !== -1) {
            gastos[index] = {
                id,
                descripcion,
                monto,
                categoria,
                fecha
            };
            
            guardarGastos();
            actualizarListaGastos();
            actualizarResumen();
            actualizarGrafico();
            
            editarGastoModal.hide();
        }
    }
    
    // Función para eliminar un gasto
    function eliminarGasto(e) {
        if (confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            gastos = gastos.filter(g => g.id !== id);
            
            guardarGastos();
            actualizarListaGastos();
            actualizarResumen();
            actualizarGrafico();
        }
    }
    
    // Función para exportar los datos a CSV
    function exportarACSV() {
        if (gastos.length === 0) {
            alert('No hay gastos para exportar');
            return;
        }
        
        // Encabezados CSV
        let csv = 'Descripción,Monto,Categoría,Fecha\n';
        
        // Agregar cada gasto
        gastos.forEach(gasto => {
            csv += `"${gasto.descripcion}",${gasto.monto},"${gasto.categoria}",${gasto.fecha}\n`;
        });
        
        // Crear archivo y descargar
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'gastos_personales.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});