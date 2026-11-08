'use strict';

/*
 * Lista de pedidos con JavaScript - Programación II
 * Los pedidos y su estado de entrega se guardan en una cookie del navegador.
 */

const NOMBRE_COOKIE = 'pedidos_programacion2';
const DIAS_COOKIE = 365;

const formulario = document.getElementById('form-pedido');
const entradaTexto = document.getElementById('pedido-texto');
const entradaFecha = document.getElementById('pedido-fecha');
const lista = document.getElementById('lista-pedidos');
const listaVacia = document.getElementById('lista-vacia');
const contador = document.getElementById('contador-pedidos');
const botonLimpiar = document.getElementById('btn-limpiar');
const mensaje = document.getElementById('mensaje-pedidos');
const avisoCookies = document.getElementById('aviso-cookies');

let pedidos = cargarPedidos();
let idEnEdicion = null;
let temporizadorMensaje = null;

/* --------------------------------------------------------------------------
   Utilidades para las cookies
   -------------------------------------------------------------------------- */

function guardarCookie(nombre, valor, dias) {
    const fechaExpiracion = new Date();
    fechaExpiracion.setTime(fechaExpiracion.getTime() + dias * 24 * 60 * 60 * 1000);

    document.cookie = nombre + '=' + encodeURIComponent(valor) +
        '; expires=' + fechaExpiracion.toUTCString() +
        '; path=/; SameSite=Lax';
}

function leerCookie(nombre) {
    const partes = document.cookie ? document.cookie.split('; ') : [];

    for (const parte of partes) {
        const separador = parte.indexOf('=');
        if (separador === -1) {
            continue;
        }

        const clave = parte.slice(0, separador);
        if (clave === nombre) {
            return decodeURIComponent(parte.slice(separador + 1));
        }
    }

    return null;
}

function borrarCookie(nombre) {
    document.cookie = nombre + '=; Max-Age=0; path=/; SameSite=Lax';
}

function cookiesDisponibles() {
    guardarCookie('prueba_cookies_pedidos', '1', 1);
    const disponible = leerCookie('prueba_cookies_pedidos') === '1';
    borrarCookie('prueba_cookies_pedidos');
    return disponible;
}

/* --------------------------------------------------------------------------
   Estado de los pedidos (lectura y escritura en la cookie)
   -------------------------------------------------------------------------- */

function generarId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }

    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function cargarPedidos() {
    const datos = leerCookie(NOMBRE_COOKIE);

    if (!datos) {
        return [];
    }

    try {
        const guardados = JSON.parse(datos);

        if (!Array.isArray(guardados)) {
            return [];
        }

        return guardados
            .filter(function (pedido) {
                return pedido && typeof pedido.texto === 'string';
            })
            .map(function (pedido) {
                return {
                    id: pedido.id ? String(pedido.id) : generarId(),
                    texto: pedido.texto.slice(0, 120),
                    fecha: typeof pedido.fecha === 'string' ? pedido.fecha : '',
                    entregado: Boolean(pedido.entregado)
                };
            });
    } catch (error) {
        return [];
    }
}

function guardarPedidos() {
    guardarCookie(NOMBRE_COOKIE, JSON.stringify(pedidos), DIAS_COOKIE);
}

/* --------------------------------------------------------------------------
   Utilidades de fechas
   -------------------------------------------------------------------------- */

function formatearFecha(fechaISO) {
    if (!fechaISO) {
        return 'Sin fecha de entrega';
    }

    const partes = fechaISO.split('-');
    if (partes.length !== 3) {
        return fechaISO;
    }

    return partes[2] + '/' + partes[1] + '/' + partes[0];
}

function fechaDeHoy() {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');

    return hoy.getFullYear() + '-' + mes + '-' + dia;
}

function estaAtrasado(pedido) {
    return !pedido.entregado && pedido.fecha !== '' && pedido.fecha < fechaDeHoy();
}

/* --------------------------------------------------------------------------
   Render de la lista
   -------------------------------------------------------------------------- */

function crearBoton(texto, clase, accion, etiquetaAccesible) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton-icono ' + clase;
    boton.textContent = texto;

    if (etiquetaAccesible) {
        boton.setAttribute('aria-label', etiquetaAccesible);
    }

    boton.addEventListener('click', accion);
    return boton;
}

function crearElementoPedido(pedido) {
    const elemento = document.createElement('li');
    elemento.className = 'pedido-item';
    elemento.dataset.id = pedido.id;

    if (pedido.entregado) {
        elemento.classList.add('entregado');
    }

    if (estaAtrasado(pedido)) {
        elemento.classList.add('atrasado');
    }

    /* Check para marcar el pedido como entregado */
    const etiquetaCheck = document.createElement('label');
    etiquetaCheck.className = 'pedido-check';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = pedido.entregado;
    checkbox.setAttribute('aria-label', 'Marcar el pedido "' + pedido.texto + '" como entregado');
    checkbox.addEventListener('change', function () {
        alternarEntrega(pedido.id);
    });

    etiquetaCheck.appendChild(checkbox);

    /* Contenido: pedido, fecha, estado, edición o acciones */
    const contenido = document.createElement('div');
    contenido.className = 'pedido-contenido';

    if (idEnEdicion === pedido.id) {
        const entradaEdicion = document.createElement('input');
        entradaEdicion.type = 'text';
        entradaEdicion.className = 'editar-texto';
        entradaEdicion.value = pedido.texto;
        entradaEdicion.maxLength = 120;
        entradaEdicion.setAttribute('aria-label', 'Nuevo contenido del pedido');

        const accionesEdicion = document.createElement('div');
        accionesEdicion.className = 'editar-acciones';

        const botonGuardar = crearBoton('Guardar', 'boton-guardar', function () {
            guardarEdicion(pedido.id, entradaEdicion.value);
        });

        const botonCancelar = crearBoton('Cancelar', 'boton-cancelar', function () {
            idEnEdicion = null;
            renderizar();
        });

        entradaEdicion.addEventListener('keydown', function (evento) {
            if (evento.key === 'Enter') {
                evento.preventDefault();
                guardarEdicion(pedido.id, entradaEdicion.value);
            }

            if (evento.key === 'Escape') {
                idEnEdicion = null;
                renderizar();
            }
        });

        accionesEdicion.appendChild(botonGuardar);
        accionesEdicion.appendChild(botonCancelar);
        contenido.appendChild(entradaEdicion);
        contenido.appendChild(accionesEdicion);

        window.setTimeout(function () {
            entradaEdicion.focus();
            entradaEdicion.select();
        }, 0);
    } else {
        const texto = document.createElement('span');
        texto.className = 'pedido-texto';
        texto.textContent = pedido.texto;

        const fecha = document.createElement('span');
        fecha.className = 'pedido-fecha';

        const etiquetaFecha = document.createElement('span');
        etiquetaFecha.className = 'etiqueta-entrega';
        etiquetaFecha.textContent = 'Entrega: ' + formatearFecha(pedido.fecha);
        fecha.appendChild(etiquetaFecha);

        const estado = document.createElement('span');

        if (pedido.entregado) {
            estado.className = 'etiqueta-estado etiqueta-entregado';
            estado.textContent = 'Entregado';
        } else if (estaAtrasado(pedido)) {
            estado.className = 'etiqueta-estado etiqueta-atrasado';
            estado.textContent = 'Atrasado';
        } else {
            estado.className = 'etiqueta-estado etiqueta-pendiente';
            estado.textContent = 'Pendiente';
        }

        fecha.appendChild(estado);
        contenido.appendChild(texto);
        contenido.appendChild(fecha);
    }

    elemento.appendChild(etiquetaCheck);
    elemento.appendChild(contenido);

    /* Botones de editar y eliminar */
    if (idEnEdicion !== pedido.id) {
        const acciones = document.createElement('div');
        acciones.className = 'pedido-acciones';

        acciones.appendChild(crearBoton(
            'Editar',
            'boton-editar',
            function () {
                idEnEdicion = pedido.id;
                renderizar();
            },
            'Editar el pedido "' + pedido.texto + '"'
        ));

        acciones.appendChild(crearBoton(
            'Eliminar',
            'boton-eliminar',
            function () {
                eliminarPedido(pedido.id);
            },
            'Eliminar el pedido "' + pedido.texto + '"'
        ));

        elemento.appendChild(acciones);
    }

    return elemento;
}

function renderizar() {
    lista.textContent = '';

    if (idEnEdicion !== null && !pedidos.some(function (pedido) {
        return pedido.id === idEnEdicion;
    })) {
        idEnEdicion = null;
    }

    listaVacia.hidden = pedidos.length > 0;

    pedidos.forEach(function (pedido) {
        lista.appendChild(crearElementoPedido(pedido));
    });

    actualizarResumen();
}

function actualizarResumen() {
    const total = pedidos.length;
    const entregados = pedidos.filter(function (pedido) {
        return pedido.entregado;
    }).length;

    if (total === 0) {
        contador.textContent = '0 pedidos';
    } else {
        contador.textContent = entregados + ' de ' + total + ' ' +
            (total === 1 ? 'pedido entregado' : 'pedidos entregados');
    }

    botonLimpiar.disabled = entregados === 0;
}

function mostrarMensaje(texto, tipo) {
    window.clearTimeout(temporizadorMensaje);

    mensaje.textContent = texto;
    mensaje.className = 'mensaje-pedidos visible ' +
        (tipo === 'error' ? 'mensaje-error' : 'mensaje-ok');

    temporizadorMensaje = window.setTimeout(function () {
        mensaje.textContent = '';
        mensaje.className = 'mensaje-pedidos';
    }, 3500);
}

/* --------------------------------------------------------------------------
   Acciones de los pedidos
   -------------------------------------------------------------------------- */

function agregarPedido(evento) {
    evento.preventDefault();

    const texto = entradaTexto.value.trim();
    const fecha = entradaFecha.value;

    if (texto === '') {
        mostrarMensaje('Escribe el contenido del pedido.', 'error');
        entradaTexto.focus();
        return;
    }

    if (fecha === '') {
        mostrarMensaje('Selecciona una fecha de entrega para el pedido.', 'error');
        entradaFecha.focus();
        return;
    }

    pedidos.push({
        id: generarId(),
        texto: texto,
        fecha: fecha,
        entregado: false
    });

    guardarPedidos();
    formulario.reset();
    entradaTexto.focus();
    renderizar();
    mostrarMensaje('Pedido agregado correctamente.', 'ok');
}

function alternarEntrega(id) {
    const pedido = pedidos.find(function (elemento) {
        return elemento.id === id;
    });

    if (!pedido) {
        return;
    }

    pedido.entregado = !pedido.entregado;
    guardarPedidos();
    renderizar();

    mostrarMensaje(
        pedido.entregado ? 'Pedido marcado como entregado.' : 'Pedido marcado como pendiente.',
        'ok'
    );
}

function guardarEdicion(id, nuevoTexto) {
    const texto = nuevoTexto.trim();

    if (texto === '') {
        mostrarMensaje('El pedido no puede quedar vacío.', 'error');
        return;
    }

    const pedido = pedidos.find(function (elemento) {
        return elemento.id === id;
    });

    if (!pedido) {
        idEnEdicion = null;
        renderizar();
        return;
    }

    pedido.texto = texto;
    idEnEdicion = null;
    guardarPedidos();
    renderizar();
    mostrarMensaje('Pedido actualizado correctamente.', 'ok');
}

function eliminarPedido(id) {
    const pedido = pedidos.find(function (elemento) {
        return elemento.id === id;
    });

    if (!pedido) {
        return;
    }

    if (!window.confirm('¿Eliminar el pedido "' + pedido.texto + '"?')) {
        return;
    }

    pedidos = pedidos.filter(function (elemento) {
        return elemento.id !== id;
    });

    if (idEnEdicion === id) {
        idEnEdicion = null;
    }

    guardarPedidos();
    renderizar();
    mostrarMensaje('Pedido eliminado.', 'ok');
}

function eliminarEntregados() {
    const entregados = pedidos.filter(function (pedido) {
        return pedido.entregado;
    }).length;

    if (entregados === 0) {
        return;
    }

    if (!window.confirm('¿Eliminar ' + entregados + ' pedido(s) entregado(s)?')) {
        return;
    }

    pedidos = pedidos.filter(function (pedido) {
        return !pedido.entregado;
    });

    if (idEnEdicion !== null && !pedidos.some(function (pedido) {
        return pedido.id === idEnEdicion;
    })) {
        idEnEdicion = null;
    }

    guardarPedidos();
    renderizar();
    mostrarMensaje('Pedidos entregados eliminados.', 'ok');
}

/* --------------------------------------------------------------------------
   Inicialización
   -------------------------------------------------------------------------- */

formulario.addEventListener('submit', agregarPedido);
botonLimpiar.addEventListener('click', eliminarEntregados);

if (!cookiesDisponibles()) {
    avisoCookies.hidden = false;
}

renderizar();
