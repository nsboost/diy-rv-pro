import { clearAdminToken } from '../api/authStorage.js'
import { requestControllerJson } from '../api/controllerRequest.js'
import { useEffect, useState } from 'react'
import { fetchConfig, getAdminToken, saveConfig } from '../api/telemetryClient.js'

export default function ControllerSettings({ telemetry, apiOnline, onProfile, onSetup, onLoadDemo, onRestoreDemo, demoTimezone, onDemoTimezone }) {
  const [status, setStatus] = useState(null)
  const [config, setConfig] = useState(null)
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [remember, setRemember] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [scheduleTimezone, setScheduleTimezone] = useState(demoTimezone || 'America/Denver')
  useEffect(() => { setScheduleTimezone(demoTimezone || 'America/Denver') }, [demoTimezone])
  const [network, setNetwork] = useState({apSsid:'DIY-RV-PRO', apPassword:'',stationSsid:'',stationPassword:'',timezone:'America/Denver'})
  const refresh = async () => {
    const next = await requestControllerJson('/api/status', {headers:{Accept:'application/json'}})
    if (typeof next.setupComplete !== 'boolean' || next.target !== 'esp32-s3') throw new Error('Controller returned an invalid status')
    setStatus(next)
    if (getAdminToken()) {
      const saved = await fetchConfig(getAdminToken()); setConfig(saved)
      setNetwork(current => ({...current,apSsid:saved.apSsid,stationSsid:saved.stationSsid,timezone:saved.timezone}))
    }
  }
  useEffect(() => {refresh().catch(() => {})}, [])
  const storeToken = value => {
    window.localStorage.removeItem('diy-rv-admin-token'); window.sessionStorage.removeItem('diy-rv-admin-token')
    ;(remember ? window.localStorage : window.sessionStorage).setItem('diy-rv-admin-token',value)
  }
  const update = (key,value) => setNetwork(current => ({...current,[key]:value}))
  const run = async work => {setBusy(true); setMessage('');try {await work()} catch(error) {setMessage(error.message)} finally {setBusy(false)}}
  return <section className="panel utility-panel" id="section-settings">
    <h2>Controller Connection</h2>
    {status?.clockStatus && <p>Controller clock: {status.clockStatus === 'synchronized' ? 'Synchronized' : 'Unavailable — scheduled rules wait for network time'}. Time-zone changes apply after restarting.</p>}
    {status?.stationStatus && <p role="status">Station Wi-Fi: {({connected:'Connected', connecting:'Connecting / retrying', disabled:'Not configured'})[status.stationStatus] || 'Unknown'}. Network changes apply after restarting the controller.</p>}
    <div className="utility-grid"><span>{apiOnline ? 'Authenticated controller' : telemetry.controller.mode === 'simulation' ? 'Browser demo' : 'Controller disconnected or signed out'}</span><span>Firmware: {telemetry.controller.firmware}</span><span>Address: {telemetry.controller.localIp}</span><span>Authentication: {getAdminToken() ? 'Token saved' : 'Signed out'}</span></div>
    <form className="settings-form" onSubmit={event => {event.preventDefault();run(async () => {
      const value = token.trim();if(value.length < 16 || value.length > 128) throw new Error('Enter the controller admin token')
      const saved = await fetchConfig(value);if(!saved.setupComplete) throw new Error('Complete first-boot setup below before connecting');storeToken(value);setConfig(saved);onProfile(saved.features);setToken('');await refresh();setMessage('Connected. Controller data will refresh automatically.')
    })}}>
      <label className="config-field"><span>Admin token</span><input type={showToken ? 'text' : 'password'} autoComplete="off" value={token} onChange={event => setToken(event.target.value)} /></label>
      <label className="inline-check"><input type="checkbox" checked={showToken} onChange={event => setShowToken(event.target.checked)} />Show token for secure recording</label>
      <label className="inline-check"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />Remember on this browser</label>
      <div className="config-toolbar"><button className="primary-action" disabled={busy} type="submit">Connect</button><button className="secondary-action" type="button" disabled={busy} onClick={() => run(async () => {await refresh();setMessage('Controller status refreshed.')})}>Refresh Status</button><button className="secondary-action" type="button" disabled={busy} onClick={() => run(async () => {clearAdminToken([() => window.sessionStorage, () => window.localStorage]);setConfig(null);setToken('');setMessage('Signed out. Controller rules continue running.')})}>Sign Out</button></div>
    </form>
    {status && (!status.setupComplete || config) && <form className="settings-form" onSubmit={event => {event.preventDefault();run(async () => {
      const firstBoot = !status.setupComplete
      if (!network.apSsid.trim()) throw new Error('Enter an access point name')
      if ((firstBoot || network.apPassword) && network.apPassword.length < 8) throw new Error('Access point password requires at least 8 characters')
      if (firstBoot && token.trim().length < 32) throw new Error('Generate or enter an admin token of at least 32 characters')
      try { new Intl.DateTimeFormat('en-US',{timeZone:network.timezone}) } catch { throw new Error('Enter a valid time zone such as America/Denver') }
      const payload = {apSsid:network.apSsid, stationSsid:network.stationSsid, timezone:network.timezone}
      if(network.apPassword) payload.apPassword=network.apPassword
      if(network.stationPassword) payload.stationPassword=network.stationPassword
      if(firstBoot) payload.adminToken=token.trim()
      const saved=await saveConfig(payload,firstBoot ? undefined : getAdminToken())
      if(firstBoot)storeToken(token.trim())
      setToken('');setConfig(saved);setStatus(current => ({...current,setupComplete:saved.setupComplete}));onProfile(saved.features)
      setNetwork(current => ({...current,apPassword:'',stationPassword:''}));setMessage('Controller configuration saved. Restart the board to apply network and bus changes; reconnect to the secured access point.')
    })}}>
      <h3>{status.setupComplete ? 'Network Configuration' : 'First-Boot Setup'}</h3>
      {!status.setupComplete && <p>Generate an admin token, store it securely, and set an access point password before saving.</p>}
      {!status.setupComplete && <button className="secondary-action" type="button" onClick={() => {setToken(Array.from(crypto.getRandomValues(new Uint8Array(32)),value => value.toString(16).padStart(2,'0')).join(''));setMessage('Token generated. Copy and store it before completing setup.') }}>Generate Admin Token</button>}
      <div className="config-form-grid">{[['apSsid','Access point name','text'],['apPassword','Access point password','password'],['stationSsid','Station Wi-Fi name','text'],['stationPassword','Station Wi-Fi password','password'],['timezone','Time zone','text']].map(([key,label,type]) => <label className="config-field" key={key}><span>{label}</span><input type={type} autoComplete="off" value={network[key]} onChange={event => update(key,event.target.value)} maxLength={key.endsWith('Ssid') ? 32 : key.endsWith('Password') ? 63 : 39} placeholder={type === 'password' && status.setupComplete ? 'Leave blank to keep current password' : ''} /></label>)}</div>
      <button className="primary-action" type="submit" disabled={busy}>{status.setupComplete ? 'Save Network Configuration' : 'Complete First-Boot Setup'}</button>
    </form>}
    <button className="wide-action" onClick={onSetup} type="button">Open Configuration Wizard</button>
    {onLoadDemo && <div className="settings-form"><h3>Sample RV</h3><p>Load a sample inventory with two addressed temperature sensors, independent HVAC zones, battery, solar, inverter, generator and tanks. Your current demo inventory is backed up for restoration. Rules and alert history are retained.</p><button className="secondary-action" type="button" disabled={busy} onClick={() => run(async () => {await onLoadDemo();setMessage('Sample RV loaded in this browser. All values and equipment actions are simulated.')})}>Load Sample RV</button>{onRestoreDemo && <button className="secondary-action" type="button" disabled={busy} onClick={() => run(async () => {await onRestoreDemo();setMessage('Previous demo inventory restored.')})}>Restore Previous Demo Inventory</button>}</div>}
    {onLoadDemo && onDemoTimezone && <div className="settings-form"><h3>Demo schedule clock</h3><p>Local Time automation rules use this time zone. Changes are saved in this browser.</p><label className="config-field"><span>Schedule time zone</span><input value={scheduleTimezone} maxLength={39} placeholder="America/Denver" onChange={event => setScheduleTimezone(event.target.value)} /></label><button className="secondary-action" type="button" disabled={busy} onClick={() => run(async () => {await onDemoTimezone(scheduleTimezone.trim());setMessage('Demo schedule time zone saved.')})}>Save Schedule Time Zone</button></div>}
    {message && <p className="configurator-status" role="status">{message}</p>}
  </section>
}
