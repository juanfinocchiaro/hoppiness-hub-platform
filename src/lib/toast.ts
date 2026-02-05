import { toast } from 'sonner';

type ToastMessage = string | React.ReactNode;

interface PromiseOptions<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: Error) => string);
}

/**
 * API unificada para toasts usando Sonner.
 * Centraliza todos los toasts de la aplicación para consistencia visual.
 */
export const showToast = {
  /**
   * Toast de éxito (verde)
   */
  success: (message: ToastMessage) => {
    toast.success(message);
  },

  /**
   * Toast de error (rojo)
   */
  error: (message: ToastMessage) => {
    toast.error(message);
  },

  /**
   * Toast informativo (azul/neutro)
   */
  info: (message: ToastMessage) => {
    toast.info(message);
  },

  /**
   * Toast de advertencia (amarillo/naranja)
   */
  warning: (message: ToastMessage) => {
    toast.warning(message);
  },

  /**
   * Toast para promesas con estados loading/success/error
   * @example
   * showToast.promise(saveData(), {
   *   loading: 'Guardando...',
   *   success: 'Guardado correctamente',
   *   error: 'Error al guardar'
   * });
   */
  promise: <T>(
    promise: Promise<T>,
    options: PromiseOptions<T>
  ) => {
    return toast.promise(promise, options);
  },

  /**
   * Toast personalizado (para casos especiales)
   */
  custom: (message: ToastMessage, options?: Parameters<typeof toast>[1]) => {
    toast(message, options);
  },

  /**
   * Descartar todos los toasts activos
   */
  dismiss: () => {
    toast.dismiss();
  },
};
