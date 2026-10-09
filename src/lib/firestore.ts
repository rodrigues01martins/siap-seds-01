// Leitura do Firestore em tempo real (onSnapshot). O cliente só LÊ; escrita é pela /api.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  type DocumentData,
  type Firestore,
  type FirestoreError,
  type Query,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { obterDb } from './firebase'

export type ComId<T> = T & { id: string }

export interface Leitura<T> {
  dados: T
  carregando: boolean
  erro: string | null
}

export function mensagemErroLeitura(erro: Pick<FirestoreError, 'code'>): string {
  return erro.code === 'permission-denied'
    ? 'Seu perfil não tem permissão para ver estes dados.'
    : 'Não foi possível carregar os dados. Verifique a conexão e recarregue a página.'
}

/**
 * Coleção (ou consulta) em tempo real. `montar` recebe o Firestore e devolve a consulta;
 * null = nada a consultar (lista vazia, sem carregar). `chave` refaz a assinatura.
 */
export function useConsulta<T = DocumentData>(
  chave: string | null,
  montar: (db: Firestore) => Query,
): Leitura<ComId<T>[]> {
  const [estado, setEstado] = useState<Leitura<ComId<T>[]>>({ dados: [], carregando: true, erro: null })
  useEffect(() => {
    if (chave === null) {
      setEstado({ dados: [], carregando: false, erro: null })
      return
    }
    setEstado((atual) => ({ ...atual, carregando: true, erro: null }))
    return onSnapshot(
      montar(obterDb()),
      (instantaneo) =>
        setEstado({
          dados: instantaneo.docs.map((d) => ({ ...(d.data() as T), id: d.id })),
          carregando: false,
          erro: null,
        }),
      (erro) => setEstado({ dados: [], carregando: false, erro: mensagemErroLeitura(erro) }),
    )
    // `montar` depende só de `chave` (convenção deste hook).
  }, [chave])
  return estado
}

/** Atalho: coleção inteira pelo caminho. */
export function useColecao<T = DocumentData>(caminho: string | null): Leitura<ComId<T>[]> {
  return useConsulta<T>(caminho, (db) => query(collection(db, caminho!)))
}

/** Documento em tempo real; `dados` null quando não existe ou quando `caminho` é null. */
export function useDocumento<T = DocumentData>(caminho: string | null): Leitura<ComId<T> | null> {
  const [estado, setEstado] = useState<Leitura<ComId<T> | null>>({ dados: null, carregando: true, erro: null })
  useEffect(() => {
    if (caminho === null) {
      setEstado({ dados: null, carregando: false, erro: null })
      return
    }
    setEstado({ dados: null, carregando: true, erro: null })
    return onSnapshot(
      doc(obterDb(), caminho),
      (d) => setEstado({ dados: d.exists() ? { ...(d.data() as T), id: d.id } : null, carregando: false, erro: null }),
      (erro) => setEstado({ dados: null, carregando: false, erro: mensagemErroLeitura(erro) }),
    )
  }, [caminho])
  return estado
}

/**
 * Leitura única (sem tempo real), para os relatórios: o documento gerado e o código de verificação
 * usam exatamente os dados lidos neste momento, e o texto da ata editado não é sobrescrito.
 */
export async function lerDocumento<T = DocumentData>(caminho: string): Promise<ComId<T> | null> {
  const d = await getDoc(doc(obterDb(), caminho))
  return d.exists() ? { ...(d.data() as T), id: d.id } : null
}

export async function lerColecao<T = DocumentData>(caminho: string): Promise<ComId<T>[]> {
  const instantaneo = await getDocs(collection(obterDb(), caminho))
  return instantaneo.docs.map((d) => ({ ...(d.data() as T), id: d.id }))
}
