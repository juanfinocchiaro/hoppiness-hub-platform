import { useEffect } from 'react';

/**
 * Pedir - Redirección externa a MasDelivery
 * 
 * Mientras desarrollamos nuestra propia app de pedidos,
 * redirigimos a la webapp de MasDelivery.
 */
export default function Pedir() {
  useEffect(() => {
    // Redirigir a MasDelivery
    window.location.href = 'https://pedidos.masdelivery.com/hoppiness';
  }, []);

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="text-center text-white">
        <p className="text-lg">Redirigiendo a nuestra tienda...</p>
      </div>
    </div>
  );
}
