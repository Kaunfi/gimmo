// Étape 1 du simulateur — point d'entrée
// Redirige vers le composant SimulateurFlow qui gère le state global
// Pour le MVP V1, tout le state du simulateur est géré côté client avec sessionStorage

import { SimulateurFlow } from '@/components/simulator/SimulateurFlow'

export default function SimulateurPage() {
  return <SimulateurFlow initialStep={1} />
}
