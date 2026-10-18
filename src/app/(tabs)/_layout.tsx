import { NativeTabs } from 'expo-router/native-tabs';

import { useColores } from '@/lib/theme';

export default function TabsLayout() {
  const c = useColores();
  return (
    <NativeTabs backgroundColor={c.surface} indicatorColor={c.accentSoft} labelStyle={{ selected: { color: c.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Artículos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="tag.fill" md="sell" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bodega">
        <NativeTabs.Trigger.Label>Bodega</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="shippingbox.fill" md="inventory_2" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="proveedores">
        <NativeTabs.Trigger.Label>Proveedores</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="truck.box.fill" md="local_shipping" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ajustes">
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
