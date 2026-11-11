'use strict';

document.documentElement.classList.add('js');

const NOMBRE_COOKIE = 'tareas_pizzapolis_v1';
const NOMBRE_COOKIE_ANTERIOR = 'pedidos_programacion2';
const CLAVE_RESPALDO = 'tareas_pizzapolis_respaldo';
const DIAS_COOKIE = 365;
const LIMITE_COOKIE = 4000;
const MAX_TEXTO = 100;

const formulario = document.getElementById('form-tarea');
const entradaTexto = document.getElementById('tarea-texto');
const entradaFecha = document.getElementById('tarea-fecha');
const lista = document.getElementById('lista-tareas');
const listaVacia = document.getElementById('lista-vacia');
const vacioTitulo = document.getElementById('vacio-titulo');
const vacioTexto = document.getElementById('vacio-texto');
const botonLimpiar = document.getElementById('btn-limpiar');
const avisoCookies = document.getElementById('aviso-cookies');
const estadoCookie = document.getElementById('estado-cookie');
const statTotal = document.getElementById('stat-total');
const statPendientes = document.getElementById('stat-pendientes');
const statCompletadas = document.getElementById('stat-completadas');
const conteoTodas = document.getElementById('conteo-todas');
const conteoPendientes = document.getElementById('conteo-pendientes');
const conteoCompletadas = document.getElementById('conteo-completadas');
const progresoBarra = document.getElementById('progreso-barra');
const progresoRelleno = document.getElementById('progreso-relleno');
const progresoPorcentaje = document.getElementById('progreso-porcentaje');
const dialogo = document.getElementById('dialogo-confirmar');
const dialogoTitulo = document.getElementById('dialogo-titulo');
const dialogoMensaje = document.getElementById('dialogo-mensaje');
const botonDialogoConfirmar = document.getElementById('dialogo-confirmar-boton');
const contenedorToasts = document.getElementById('toasts');
const botonesFiltro = Array.prototype.slice.call(document.querySelectorAll('.filtro'));

const ICONO_EDITAR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>';

const ICONO_ELIMINAR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path>' +
    '<path d="M6 7l1 13h10l1-13"></path><path d="M9 7V4h6v3"></path></svg>';

const ICONO_CALENDARIO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 11h18"></path></svg>';

const ICONO_OK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M20 6 9 17l-5-5"></path></svg>';

const ICONO_ERROR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path></svg>';

const mediaMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
const cookiesActivas = comprobarCookies();

let tareas = cargarTareas();
let filtroActual = 'todas';
let idEnEdicion = null;
let idRecienAgregada = null;
let accionPendiente = null;

function guardarCookie(nombre, valor, dias) {
    const fechaExpiracion = new Date();
    fechaExpiracion.setTime(fechaExpiracion.getTime() + dias * 24 * 60 * 60 * 1000);

    document.cookie = nombre + '=' + encodeURIComponent(valor) +
        '; expires=' + fechaExpiracion.toUTCString() +
        '; path=/; SameSite=Lax';
}

function leerCookie(nombre) {
    const partes = document.cookie ? document.cookie.split('; ') : [];

    for (let i = 0; i < partes.length; i++) {
        const separador = partes[i].indexOf('=');

        if (separador === -1) {
            continue;
        }

        if (partes[i].slice(0, separador) === nombre) {
            return decodeURIComponent(partes[i].slice(separador + 1));
        }
    }

    return null;
}

function borrarCookie(nombre) {
    document.cookie = nombre + '=; Max-Age=0; path=/; SameSite=Lax';
}

function comprobarCookies() {
    guardarCookie('prueba_cookies_tareas', '1', 1);
    const disponibles = leerCookie('prueba_cookies_tareas') === '1';
    borrarCookie('prueba_cookies_tareas');
    return disponibles;
}

function leerRespaldo() {
    try {
        return window.localStorage.getItem(CLAVE_RESPALDO);
    } catch (error) {
        return null;
    }
}

function guardarRespaldo(valor) {
    try {
        window.localStorage.setItem(CLAVE_RESPALDO, valor);
        return true;
    } catch (error) {
        return false;
    }
}

function generarId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }

    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function cargarTareas() {
    let datos = leerCookie(NOMBRE_COOKIE);

    if (!datos) {
        datos = leerCookie(NOMBRE_COOKIE_ANTERIOR);
    }

    if (!datos && !cookiesActivas) {
        datos = leerRespaldo();
    }

    if (!datos) {
        return [];
    }

    try {
        const guardadas = JSON.parse(datos);

        if (!Array.isArray(guardadas)) {
            return [];
        }

        return guardadas.map(normalizarTarea).filter(function (tarea) {
            return tarea !== null;
        });
    } catch (error) {
        return [];
    }
}

function normalizarTarea(guardada) {
    let texto;
    let fecha;
    let completada;

    if (Array.isArray(guardada)) {
        texto = guardada[0];
        fecha = guardada[1];
        completada = guardada[2];
    } else if (guardada && typeof guardada === 'object') {

        texto = guardada.texto;
        fecha = guardada.fecha;
        completada = guardada.completada === undefined ? guardada.entregado : guardada.completada;
    }

    if (typeof texto !== 'string' || texto.trim() === '') {
        return null;
    }

    return {
        id: generarId(),
        texto: texto.trim().slice(0, MAX_TEXTO),
        fecha: typeof fecha === 'string' ? fecha : '',
        completada: Boolean(completada)
    };
}

function guardarTareas() {
    const compactas = tareas.map(function (tarea) {
        return [tarea.texto, tarea.fecha, tarea.completada ? 1 : 0];
    });

    const valor = JSON.stringify(compactas);
    guardarCookie(NOMBRE_COOKIE, valor, DIAS_COOKIE);

    if (!cookiesActivas) {
        guardarRespaldo(valor);
        return false;
    }

    if ((leerCookie(NOMBRE_COOKIE) || '') !== valor) {
        mostrarToast('No se pudo guardar: la cookie llegó a su límite de ' +
            LIMITE_COOKIE + ' caracteres. Elimina tareas completadas.', 'error');
        return false;
    }

    return true;
}

function formatearFecha(fechaISO) {
    if (!fechaISO) {
        return 'Sin fecha';
    }

    const partes = fechaISO.split('-');

    if (partes.length !== 3) {
        return fechaISO;
    }

    return partes[2] + '/' + partes[1] + '/' + partes[0];
}

function diasHasta(fechaISO) {
    if (!fechaISO) {
        return null;
    }

    const partes = fechaISO.split('-').map(Number);

    if (partes.length !== 3 || partes.some(isNaN)) {
        return null;
    }

    const objetivo = new Date(partes[0], partes[1] - 1, partes[2]);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return Math.round((objetivo.getTime() - hoy.getTime()) / (24 * 60 * 60 * 1000));
}

function describirEstado(tarea) {
    if (tarea.completada) {
        return { texto: 'Completada', clase: 'estado-completada', atrasada: false };
    }

    const dias = diasHasta(tarea.fecha);

    if (dias === null) {
        return { texto: 'Sin fecha', clase: 'estado-pendiente', atrasada: false };
    }

    if (dias < 0) {
        return { texto: 'Atrasada', clase: 'estado-atrasada', atrasada: true };
    }

    if (dias === 0) {
        return { texto: 'Vence hoy', clase: 'estado-hoy', atrasada: false };
    }

    if (dias === 1) {
        return { texto: 'Vence mañana', clase: 'estado-pronto', atrasada: false };
    }

    if (dias <= 3) {
        return { texto: 'Vence en ' + dias + ' días', clase: 'estado-pronto', atrasada: false };
    }

    return { texto: 'Pendiente', clase: 'estado-pendiente', atrasada: false };
}

function crearBotonIcono(icono, clase, etiqueta, accion) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton-icono ' + clase;
    boton.innerHTML = icono;
    boton.setAttribute('aria-label', etiqueta);
    boton.title = etiqueta;
    boton.addEventListener('click', accion);
    return boton;
}

function crearCheck(tarea) {
    const etiqueta = document.createElement('label');
    etiqueta.className = 'tarea-check';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = tarea.completada;
    checkbox.setAttribute('aria-label', 'Marcar la tarea "' + tarea.texto + '" como completada');
    checkbox.addEventListener('change', function () {
        alternarCompletada(tarea.id);
    });

    const caja = document.createElement('span');
    caja.className = 'tarea-check-caja';
    caja.setAttribute('aria-hidden', 'true');

    etiqueta.appendChild(checkbox);
    etiqueta.appendChild(caja);

    return etiqueta;
}

function crearEditor(tarea) {
    const contenedor = document.createElement('div');

    const entrada = document.createElement('input');
    entrada.type = 'text';
    entrada.className = 'tarea-editar';
    entrada.value = tarea.texto;
    entrada.maxLength = MAX_TEXTO;
    entrada.setAttribute('aria-label', 'Nuevo contenido de la tarea');

    const acciones = document.createElement('div');
    acciones.className = 'tarea-editar-acciones';

    const guardar = document.createElement('button');
    guardar.type = 'button';
    guardar.className = 'boton-mini boton-guardar';
    guardar.innerHTML = ICONO_OK + '<span>Guardar</span>';
    guardar.addEventListener('click', function () {
        guardarEdicion(tarea.id, entrada.value);
    });

    const cancelar = document.createElement('button');
    cancelar.type = 'button';
    cancelar.className = 'boton-mini boton-cancelar';
    cancelar.innerHTML = '<span>Cancelar</span>';
    cancelar.addEventListener('click', function () {
        idEnEdicion = null;
        renderizar();
    });

    entrada.addEventListener('keydown', function (evento) {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            guardarEdicion(tarea.id, entrada.value);
        } else if (evento.key === 'Escape') {
            idEnEdicion = null;
            renderizar();
        }
    });

    acciones.appendChild(guardar);
    acciones.appendChild(cancelar);
    contenedor.appendChild(entrada);
    contenedor.appendChild(acciones);

    window.setTimeout(function () {
        entrada.focus();
        entrada.select();
    }, 0);

    return contenedor;
}

function crearElementoTarea(tarea) {
    const estado = describirEstado(tarea);

    const elemento = document.createElement('li');
    elemento.className = 'tarea-item';
    elemento.dataset.id = tarea.id;

    if (tarea.completada) {
        elemento.classList.add('completada');
    }

    if (estado.atrasada) {
        elemento.classList.add('atrasada');
    }

    if (tarea.id === idRecienAgregada) {
        elemento.classList.add('recien-agregada');
    }

    elemento.appendChild(crearCheck(tarea));

    const contenido = document.createElement('div');
    contenido.className = 'tarea-contenido';

    if (idEnEdicion === tarea.id) {
        contenido.appendChild(crearEditor(tarea));
    } else {
        const texto = document.createElement('span');
        texto.className = 'tarea-texto';

        const linea = document.createElement('span');
        linea.className = 'texto-linea';
        linea.textContent = tarea.texto;
        texto.appendChild(linea);

        const meta = document.createElement('div');
        meta.className = 'tarea-meta';

        const fecha = document.createElement('span');
        fecha.className = 'tarea-fecha';
        fecha.innerHTML = ICONO_CALENDARIO;
        fecha.appendChild(document.createTextNode('Límite: ' + formatearFecha(tarea.fecha)));

        const pildora = document.createElement('span');
        pildora.className = 'tarea-pildora ' + estado.clase;
        pildora.textContent = estado.texto;

        meta.appendChild(fecha);
        meta.appendChild(pildora);

        contenido.appendChild(texto);
        contenido.appendChild(meta);
    }

    elemento.appendChild(contenido);

    if (idEnEdicion !== tarea.id) {
        const acciones = document.createElement('div');
        acciones.className = 'tarea-acciones';

        acciones.appendChild(crearBotonIcono(ICONO_EDITAR, 'boton-editar',
            'Editar la tarea "' + tarea.texto + '"', function () {
                idEnEdicion = tarea.id;
                renderizar();
            }));

        acciones.appendChild(crearBotonIcono(ICONO_ELIMINAR, 'boton-eliminar',
            'Eliminar la tarea "' + tarea.texto + '"', function () {
                pedirEliminar(tarea);
            }));

        elemento.appendChild(acciones);
    }

    return elemento;
}

function obtenerVisibles() {
    const copia = tareas.slice().sort(function (a, b) {
        if (a.completada !== b.completada) {
            return a.completada ? 1 : -1;
        }

        if (a.fecha === b.fecha) {
            return 0;
        }

        if (!a.fecha) {
            return 1;
        }

        if (!b.fecha) {
            return -1;
        }

        return a.fecha < b.fecha ? -1 : 1;
    });

    if (filtroActual === 'pendientes') {
        return copia.filter(function (tarea) {
            return !tarea.completada;
        });
    }

    if (filtroActual === 'completadas') {
        return copia.filter(function (tarea) {
            return tarea.completada;
        });
    }

    return copia;
}

function renderizar() {
    const visibles = obtenerVisibles();

    lista.textContent = '';

    visibles.forEach(function (tarea) {
        lista.appendChild(crearElementoTarea(tarea));
    });

    const total = tareas.length;
    const completadas = tareas.filter(function (tarea) {
        return tarea.completada;
    }).length;
    const pendientes = total - completadas;

    animarContador(statTotal, total);
    animarContador(statPendientes, pendientes);
    animarContador(statCompletadas, completadas);

    conteoTodas.textContent = String(total);
    conteoPendientes.textContent = String(pendientes);
    conteoCompletadas.textContent = String(completadas);

    const porcentaje = total === 0 ? 0 : Math.round((completadas / total) * 100);
    progresoRelleno.style.width = porcentaje + '%';
    progresoBarra.setAttribute('aria-valuenow', String(porcentaje));
    progresoPorcentaje.textContent = porcentaje + ' %';

    botonLimpiar.disabled = completadas === 0;

    actualizarFiltros();
    actualizarEstadoVacio(visibles.length, total);

    idRecienAgregada = null;
}

function actualizarFiltros() {
    botonesFiltro.forEach(function (boton) {
        const activo = boton.dataset.filtro === filtroActual;
        boton.classList.toggle('activo', activo);
        boton.setAttribute('aria-pressed', activo ? 'true' : 'false');
    });
}

function actualizarEstadoVacio(cantidadVisible, total) {
    listaVacia.hidden = cantidadVisible > 0;

    if (cantidadVisible > 0) {
        return;
    }

    if (total === 0) {
        vacioTitulo.textContent = 'Todavía no hay tareas';
        vacioTexto.textContent = 'Agrega la primera tarea con el formulario de arriba y empieza a organizar el día.';
    } else if (filtroActual === 'pendientes') {
        vacioTitulo.textContent = 'No quedan tareas pendientes';
        vacioTexto.textContent = 'Excelente: todas las tareas de la lista están completadas.';
    } else if (filtroActual === 'completadas') {
        vacioTitulo.textContent = 'Todavía no completaste ninguna tarea';
        vacioTexto.textContent = 'Marca el check de una tarea para verla en este filtro.';
    } else {
        vacioTitulo.textContent = 'Sin tareas para mostrar';
        vacioTexto.textContent = 'Cambia el filtro para ver el resto de la lista.';
    }
}

function animarContador(elemento, valorFinal) {
    if (elemento.dataset.raf) {
        cancelAnimationFrame(Number(elemento.dataset.raf));
        elemento.dataset.raf = '';
    }

    const inicio = Number(elemento.textContent) || 0;

    if (inicio === valorFinal || prefiereMenosMovimiento()) {
        elemento.textContent = String(valorFinal);
        return;
    }

    const duracion = 420;
    const arranque = performance.now();

    function paso(ahora) {
        const avance = Math.min((ahora - arranque) / duracion, 1);
        const suave = 1 - Math.pow(1 - avance, 3);

        elemento.textContent = String(Math.round(inicio + (valorFinal - inicio) * suave));

        if (avance < 1) {
            elemento.dataset.raf = String(requestAnimationFrame(paso));
        } else {
            elemento.textContent = String(valorFinal);
            elemento.dataset.raf = '';
        }
    }

    elemento.dataset.raf = String(requestAnimationFrame(paso));
}

function mostrarToast(mensaje, tipo) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + (tipo === 'error' ? 'error' : 'ok');
    toast.innerHTML = tipo === 'error' ? ICONO_ERROR : ICONO_OK;

    const texto = document.createElement('span');
    texto.textContent = mensaje;
    toast.appendChild(texto);

    while (contenedorToasts.children.length >= 3) {
        contenedorToasts.removeChild(contenedorToasts.firstChild);
    }

    contenedorToasts.appendChild(toast);

    window.setTimeout(function () {
        toast.classList.add('saliendo');
        window.setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3400);
}

function pedirConfirmacion(titulo, mensaje, etiquetaBoton, accion) {
    dialogoTitulo.textContent = titulo;
    dialogoMensaje.textContent = mensaje;
    botonDialogoConfirmar.textContent = etiquetaBoton;
    accionPendiente = accion;
    dialogo.returnValue = 'cancelar';

    if (typeof dialogo.showModal === 'function') {
        dialogo.showModal();
    } else if (window.confirm(titulo + ' ' + mensaje)) {
        accion();
    }
}

dialogo.addEventListener('close', function () {
    const accion = accionPendiente;
    accionPendiente = null;

    if (dialogo.returnValue === 'confirmar' && typeof accion === 'function') {
        accion();
    }
});

dialogo.addEventListener('click', function (evento) {
    if (evento.target === dialogo) {
        dialogo.close('cancelar');
    }
});

function buscarTarea(id) {
    for (let i = 0; i < tareas.length; i++) {
        if (tareas[i].id === id) {
            return tareas[i];
        }
    }

    return null;
}

function marcarError(entrada) {
    const control = entrada.closest('.campo-control');

    if (!control) {
        return;
    }

    control.classList.remove('error');
    void control.offsetWidth;
    control.classList.add('error');

    window.setTimeout(function () {
        control.classList.remove('error');
    }, 1400);
}

function agregarTarea(evento) {
    evento.preventDefault();

    const texto = entradaTexto.value.trim().replace(/\s+/g, ' ');
    const fecha = entradaFecha.value;

    if (texto === '') {
        mostrarToast('Escribe el contenido de la tarea.', 'error');
        marcarError(entradaTexto);
        entradaTexto.focus();
        return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        mostrarToast('Selecciona una fecha límite para la tarea.', 'error');
        marcarError(entradaFecha);
        entradaFecha.focus();
        return;
    }

    const nueva = {
        id: generarId(),
        texto: texto.slice(0, MAX_TEXTO),
        fecha: fecha,
        completada: false
    };

    tareas.push(nueva);
    idRecienAgregada = nueva.id;
    filtroActual = 'todas';

    guardarTareas();

    formulario.reset();
    entradaTexto.focus();
    renderizar();
    mostrarToast('Tarea agregada correctamente.', 'ok');
}

function alternarCompletada(id) {
    const tarea = buscarTarea(id);

    if (!tarea) {
        return;
    }

    tarea.completada = !tarea.completada;
    guardarTareas();
    renderizar();

    mostrarToast(
        tarea.completada ? 'Tarea marcada como completada.' : 'Tarea marcada como pendiente.',
        'ok'
    );
}

function guardarEdicion(id, nuevoTexto) {
    const texto = nuevoTexto.trim().replace(/\s+/g, ' ');

    if (texto === '') {
        mostrarToast('La tarea no puede quedar vacía.', 'error');
        return;
    }

    const tarea = buscarTarea(id);

    if (!tarea) {
        idEnEdicion = null;
        renderizar();
        return;
    }

    tarea.texto = texto.slice(0, MAX_TEXTO);
    idEnEdicion = null;

    guardarTareas();
    renderizar();
    mostrarToast('Tarea actualizada correctamente.', 'ok');
}

function pedirEliminar(tarea) {
    pedirConfirmacion(
        '¿Eliminar esta tarea?',
        'Se eliminará "' + tarea.texto + '". Esta acción no se puede deshacer.',
        'Eliminar',
        function () {
            eliminarTarea(tarea.id);
        }
    );
}

function eliminarTarea(id) {
    tareas = tareas.filter(function (tarea) {
        return tarea.id !== id;
    });

    if (idEnEdicion === id) {
        idEnEdicion = null;
    }

    guardarTareas();
    renderizar();
    mostrarToast('Tarea eliminada.', 'ok');
}

function limpiarCompletadas() {
    const completadas = tareas.filter(function (tarea) {
        return tarea.completada;
    }).length;

    if (completadas === 0) {
        mostrarToast('No hay tareas completadas para eliminar.', 'error');
        return;
    }

    pedirConfirmacion(
        '¿Eliminar tareas completadas?',
        'Se eliminarán ' + completadas + ' tarea(s) completada(s) de la lista.',
        'Eliminar',
        function () {
            tareas = tareas.filter(function (tarea) {
                return !tarea.completada;
            });

            if (idEnEdicion !== null && !buscarTarea(idEnEdicion)) {
                idEnEdicion = null;
            }

            guardarTareas();
            renderizar();
            mostrarToast('Tareas completadas eliminadas.', 'ok');
        }
    );
}

function prefiereMenosMovimiento() {
    return mediaMovimiento.matches;
}

function activarAnimaciones() {
    const elementos = Array.prototype.slice.call(document.querySelectorAll('.revelar'));

    if (!('IntersectionObserver' in window) || prefiereMenosMovimiento()) {
        elementos.forEach(function (elemento) {
            elemento.classList.add('visible');
        });
        return;
    }

    const observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) {
            if (entrada.isIntersecting) {
                entrada.target.classList.add('visible');
                observador.unobserve(entrada.target);
            }
        });
    }, { threshold: 0.12 });

    elementos.forEach(function (elemento) {
        observador.observe(elemento);
    });
}

formulario.addEventListener('submit', agregarTarea);
botonLimpiar.addEventListener('click', limpiarCompletadas);

botonesFiltro.forEach(function (boton) {
    boton.addEventListener('click', function () {
        filtroActual = boton.dataset.filtro;
        idEnEdicion = null;
        renderizar();
    });
});

entradaTexto.addEventListener('input', function () {
    const control = entradaTexto.closest('.campo-control');
    if (control) {
        control.classList.remove('error');
    }
});

entradaFecha.addEventListener('change', function () {
    const control = entradaFecha.closest('.campo-control');
    if (control) {
        control.classList.remove('error');
    }
});

if (!cookiesActivas) {
    avisoCookies.hidden = false;
    estadoCookie.textContent = 'Las cookies están bloqueadas: la lista se guarda en el almacenamiento local ' +
        'del navegador como respaldo para no perder las tareas al recargar.';
}

renderizar();
activarAnimaciones();
