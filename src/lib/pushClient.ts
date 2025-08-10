import { supabase } from './supabaseClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (!VAPID_PUBLIC_KEY) return false

  const reg = await navigator.serviceWorker.ready
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  })
  const raw = sub.toJSON() as any

  const { data: user } = await supabase.auth.getUser()
  if (!user?.user?.id) return false

  // Upsert da subscrição atual
  await (supabase as any).from('push_subscriptions').upsert({
    user_id: user.user.id,
    endpoint: raw.endpoint,
    p256dh: raw.keys?.p256dh,
    auth: raw.keys?.auth
  }, { onConflict: 'endpoint' })

  // Limpeza de subscrições antigas deste utilizador (endpoints diferentes)
  await (supabase as any)
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.user.id)
    .neq('endpoint', raw.endpoint)

  return true
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    const { data: user } = await supabase.auth.getUser()
    if (user?.user?.id) {
      await (supabase as any).from('push_subscriptions').delete().eq('user_id', user.user.id).eq('endpoint', endpoint)
    }
  }
  return true
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
} 