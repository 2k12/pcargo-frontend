/** «v1.0.0»: la versión de la app que se muestra en el login. */
export const VERSION_APP = `v${__APP_VERSION__}`

/** Texto de ayuda con el commit desplegado, si se conoce. */
export const DETALLE_VERSION = __APP_COMMIT__ ? `PCargo ${VERSION_APP} · ${__APP_COMMIT__}` : `PCargo ${VERSION_APP}`
