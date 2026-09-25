// Palacios de la memoria: un lugar distinto cada día (evita que se mezclen las imágenes)
// y 10 rincones por lugar: cada "habitación" del día guarda 10 palabras en ese rincón.
export interface Palace { name: string; emoji: string; spots: string[] }

export const PALACES: Palace[] = [
  { name: 'Tu casa', emoji: '🏠', spots: ['la puerta de entrada', 'el recibidor', 'el salón', 'el sofá', 'la cocina', 'la nevera', 'el baño', 'la ducha', 'tu dormitorio', 'tu cama'] },
  { name: 'Tu calle', emoji: '🛣️', spots: ['el portal', 'la acera', 'el semáforo', 'el paso de cebra', 'la parada de autobús', 'el bar de la esquina', 'la farmacia', 'el quiosco', 'el banco del parque', 'la fuente'] },
  { name: 'El supermercado', emoji: '🛒', spots: ['la entrada', 'los carritos', 'la fruta', 'la carnicería', 'la pescadería', 'los congelados', 'las bebidas', 'los dulces', 'la caja', 'el aparcamiento'] },
  { name: 'Tu colegio', emoji: '🏫', spots: ['la verja', 'el patio', 'el pasillo', 'tu clase', 'la pizarra', 'el despacho del director', 'el comedor', 'el gimnasio', 'la biblioteca', 'los baños'] },
  { name: 'La playa', emoji: '🏖️', spots: ['el paseo marítimo', 'el chiringuito', 'la arena', 'la sombrilla', 'la toalla', 'la orilla', 'las olas', 'la boya', 'el socorrista', 'las duchas'] },
  { name: 'El aeropuerto', emoji: '✈️', spots: ['la entrada', 'los mostradores', 'el control de seguridad', 'las tiendas duty free', 'la puerta de embarque', 'la pasarela', 'tu asiento', 'la ventanilla', 'la cinta de equipajes', 'la salida'] },
  { name: 'El hospital', emoji: '🏥', spots: ['las urgencias', 'la recepción', 'la sala de espera', 'el ascensor', 'la consulta', 'la camilla', 'el quirófano', 'la farmacia', 'la cafetería', 'la habitación'] },
  { name: 'El estadio', emoji: '🏟️', spots: ['la taquilla', 'los tornos', 'las gradas', 'el banquillo', 'el centro del campo', 'la portería', 'el córner', 'el marcador', 'el vestuario', 'el palco'] },
  { name: 'El cine', emoji: '🎬', spots: ['la taquilla', 'las palomitas', 'el pasillo', 'la butaca', 'la pantalla', 'el proyector', 'la salida de emergencia', 'los baños', 'el cartel', 'la alfombra roja'] },
  { name: 'El gimnasio', emoji: '🏋️', spots: ['la recepción', 'la cinta de correr', 'las pesas', 'la bici estática', 'el espejo', 'la sala de yoga', 'la piscina', 'la sauna', 'las taquillas', 'la máquina de bebidas'] },
  { name: 'Un restaurante', emoji: '🍽️', spots: ['la puerta', 'la barra', 'tu mesa', 'la carta', 'la cocina', 'el horno de leña', 'la bodega', 'el carrito de postres', 'la caja', 'la terraza'] },
  { name: 'El parque', emoji: '🌳', spots: ['la entrada', 'el estanque', 'el columpio', 'el tobogán', 'el césped', 'el árbol gigante', 'el quiosco de música', 'el pipicán', 'la fuente', 'el banco'] },
  { name: 'Una oficina', emoji: '🏢', spots: ['el ascensor', 'la recepción', 'tu mesa', 'el ordenador', 'la impresora', 'la sala de reuniones', 'la máquina de café', 'el despacho del jefe', 'la ventana', 'la papelera'] },
  { name: 'La estación de tren', emoji: '🚆', spots: ['la entrada', 'el panel de horarios', 'la taquilla', 'el andén', 'la vía', 'el vagón', 'tu asiento', 'el vagón restaurante', 'el revisor', 'la salida'] },
  { name: 'El zoo', emoji: '🦁', spots: ['la taquilla', 'los monos', 'los leones', 'las jirafas', 'los elefantes', 'el acuario', 'los pingüinos', 'el terrario', 'los osos', 'la tienda de regalos'] },
  { name: 'Un museo', emoji: '🖼️', spots: ['las escaleras', 'la taquilla', 'la sala de dinosaurios', 'las momias', 'las armaduras', 'los cuadros', 'las esculturas', 'la sala del tesoro', 'la cafetería', 'la tienda'] },
  { name: 'Un hotel', emoji: '🏨', spots: ['la puerta giratoria', 'la recepción', 'el ascensor', 'el pasillo', 'tu habitación', 'el minibar', 'el balcón', 'el buffet', 'la piscina', 'el spa'] },
  { name: 'La piscina', emoji: '🏊', spots: ['los vestuarios', 'las duchas', 'el borde', 'el trampolín', 'el agua', 'el fondo', 'el socorrista', 'las hamacas', 'el césped', 'el bar'] },
  { name: 'Una granja', emoji: '🐄', spots: ['el camino', 'el granero', 'el gallinero', 'la pocilga', 'el establo', 'el tractor', 'el huerto', 'el pozo', 'el pajar', 'la casa del granjero'] },
  { name: 'Un castillo', emoji: '🏰', spots: ['el foso', 'el puente levadizo', 'el patio de armas', 'la torre', 'el salón del trono', 'la mazmorra', 'la cocina medieval', 'la armería', 'la capilla', 'las almenas'] },
  { name: 'La montaña', emoji: '⛰️', spots: ['el aparcamiento', 'el sendero', 'el puente colgante', 'la cascada', 'el refugio', 'la cueva', 'el lago helado', 'el glaciar', 'el teleférico', 'la cima'] },
  { name: 'Un barco', emoji: '🚢', spots: ['el muelle', 'la pasarela', 'la cubierta', 'el puente de mando', 'el timón', 'los camarotes', 'la sala de máquinas', 'el comedor', 'la piscina', 'el ancla'] },
  { name: 'Una catedral', emoji: '⛪', spots: ['la escalinata', 'el pórtico', 'la pila bautismal', 'los bancos', 'el púlpito', 'el altar', 'el órgano', 'las vidrieras', 'la cripta', 'el campanario'] },
  { name: 'Una discoteca', emoji: '🪩', spots: ['la cola', 'el portero', 'el guardarropa', 'la barra', 'la pista de baile', 'la cabina del DJ', 'los altavoces', 'la zona VIP', 'los baños', 'la salida'] },
  { name: 'La biblioteca', emoji: '📚', spots: ['la entrada', 'el mostrador', 'los ordenadores', 'la sala infantil', 'las estanterías', 'la mesa de estudio', 'la sala de periódicos', 'la escalera de caracol', 'el archivo', 'el jardín'] },
  { name: 'Un centro comercial', emoji: '🛍️', spots: ['el parking', 'las escaleras mecánicas', 'la tienda de ropa', 'los probadores', 'la juguetería', 'la zona de comidas', 'la bolera', 'el cine', 'la fuente central', 'la salida'] },
  { name: 'La feria', emoji: '🎡', spots: ['la entrada', 'los coches de choque', 'la noria', 'la montaña rusa', 'la casa del terror', 'el puesto de algodón de azúcar', 'la tómbola', 'el tiro al blanco', 'el carrusel', 'el escenario'] },
  { name: 'La selva', emoji: '🌴', spots: ['el río', 'la canoa', 'las lianas', 'el árbol más alto', 'la cabaña', 'el templo perdido', 'las arenas movedizas', 'la cascada', 'el nido de serpientes', 'el campamento'] },
  { name: 'Una estación espacial', emoji: '🚀', spots: ['la plataforma', 'el cohete', 'la cabina', 'los paneles', 'la cocina sin gravedad', 'las literas', 'el laboratorio', 'la escotilla', 'el paseo espacial', 'la Luna'] },
  { name: 'La casa de tu infancia', emoji: '🧸', spots: ['la puerta', 'el pasillo', 'tu cuarto', 'tu juguete favorito', 'la cocina de tu abuela', 'la mesa del comedor', 'el balcón', 'el trastero', 'el jardín', 'el tejado'] },
];

export const palaceFor = (day: number) => PALACES[(day - 1) % PALACES.length];
