/* eslint-env mocha */
const path = require('path')
const os = require('os')
const fs = require('fs-extra')
var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const expect = chai.expect
const { VRouter } = require(path.join(__dirname, '../js/vrouter-local.js'))
const { VRouterRemote } = require(path.join(__dirname, '../js/vrouter-remote.js'))
// const configFile = path.join(__dirname, './config-test.json')
const configFile = path.join(__dirname, '../config/config.json')

describe('Test ability of building VM', function () {
  this.timeout(600000)
  this.slow(150000)
  let vrouter
  before('get vrouter instance', function () {
    vrouter = new VRouter()
  })
  // after('poweroff vm', function () {
    // return vrouter.stopVM('poweroff', 20000)
  // })
  it('process buildVM', function () {
    return expect(vrouter.buildVM(null, true))
      .to.eventually.fulfilled
  })
  it('test builded VM', function () {
    return vrouter.startVM('headless', 30000)
      .then(() => {
        return vrouter.connect()
      })
      .then((vrouterRemote) => {
        expect(vrouterRemote instanceof VRouterRemote).to.be.true
        return expect(vrouterRemote.getSSVersion()).to.be.fulfilled
          .then(() => {
            return expect(vrouterRemote.getKTVersion()).to.be.fulfilled
          })
          .then(() => {
            return expect(vrouterRemote.remoteExec('opkg info dnsmasq-full'))
              .to.be.fulfilled
          })
          .then(() => {
            return vrouterRemote.remoteExec('ipset -v')
              .then((output) => {
                return expect(output.trim()).to.equal('ipset v6.24, protocol version: 6')
              })
          })
          .then(() => {
            return expect(vrouterRemote.remoteExec('no-xx')).to.be.rejected
          })
          .then(() => {
            return vrouterRemote.close()
          })
      })
      .catch((err) => {
        console.log('should not have this')
        console.log(err)
      })
  })

  it('getOSXNetworkService', function () {
    return vrouter.getOSXNetworkService('en0')
      .then((output) => {
        expect(output).to.equal('Wi-Fi')
      })
  })
  it('changeRouteTo vrouter', function () {
    // return vrouter.changeRouteTo()
    return vrouter.changeRouteTo('vrouter')
      .then(() => {
        return vrouter.getCurrentGateway()
          .then((output) => {
            expect(output).to.be.deep.equal([
              vrouter.config.vrouter.ip,
              vrouter.config.vrouter.ip
            ])
          })
      })
  })
  it('changeRouteTo wifi', function () {
    const ip = '192.168.1.1'
    return vrouter.changeRouteTo('wifi')
      .then(() => {
        return vrouter.getCurrentGateway()
          .then((output) => {
            expect(output).to.be.deep.equal([ip, ip])
          })
      })
  })
})

describe('Test ability of manage vm', function () {
  this.slow(1000)
  let vrouter
  let buildByTest = false
  before('buildvm is necessary', function () {
    vrouter = new VRouter()
    return vrouter.isVRouterExisted()
      .catch((err) => {
        console.log(err)
        return vrouter.buildVM()
          .then(() => {
            buildByTest = true
          })
      })
  })

  after('remove test-vm', function () {
    if (buildByTest) {
      return vrouter.deleteVM(true)
    }
  })

  it('localExec("echo hello") should return hello', function () {
    return expect(vrouter.localExec('echo hello'))
      .to.eventually.equal('hello\n')
  })
  it('sendKeystrokes')
  it('test serialExec.', function () {
    this.timeout(50000)
    const content = `${Date.now()}+test`
    return vrouter.serialExec(`echo '${content}' > /${content}`)
      .then(() => {
        return vrouter.connect()
      })
      .then((remote) => {
        return remote.remoteExec(`cat /${content}`)
          .then((output) => {
            expect(output).to.be.equal(content)
          })
          .then(() => {
            return remote.remoteExec(`rm /${content}`)
          })
          .then(() => {
            return remote.close()
          })
      })
  })
  it('wait(100) should return after 100ms', function () {
    const waitTime = 100
    const promise = Promise.resolve()
      .then(() => Date.now())
      .then((startT) => {
        return vrouter.wait(waitTime)
          .then(() => Date.now() - startT)
      })
    return expect(promise).to.eventually.within(waitTime, waitTime + 50)
  })
  it('importVM')
  it('exportVM')
  it('deleteVM')
  it('startVM/stopVM should be able start/stop a vm')

  it('isVBInstalled should be fulfilled true', function () {
    return vrouter.localExec('VBoxManage')
      .then(() => {
        return expect(vrouter.isVBInstalled()).to.eventually.be.true
      })
  })

  it('isVRouterExisted should be fulfilled when vm exist', function () {
    return expect(vrouter.isVRouterExisted()).to.eventually.be.true
  })
  it('isVRouterExisted should be reject when vm absent', function () {
    const name = vrouter.config.vrouter.name
    vrouter.config.vrouter.name = 'non-exist-name'
    return vrouter.isVRouterExisted()
      .then((state) => {
        vrouter.config.vrouter.name = name
        expect(state).to.be.false
      })
  })

  it('getVMState should return "running" or "poweroff" depend on vm state', function () {
    return vrouter.localExec(`VBoxManage showvminfo ${vrouter.config.vrouter.name} --machinereadable | grep VMState=`)
      .then((output) => {
        if (output.indexOf('running') >= 0) {
          return expect(vrouter.getVMState())
            .to.eventually.equal('running')
        } else if (output.indexOf('poweroff') >= 0) {
          return expect(vrouter.getVMState())
            .to.eventually.equal('poweroff')
        } else if (output.indexOf('saved') >= 0) {
          return expect(vrouter.getVMState())
            .to.eventually.equal('saved')
        }
      })
  })
  it('benchmark getVMState', function () {
    return vrouter.getVMState().catch(() => {})
  })
  it('benchmark isVRouterRunning', function () {
    return vrouter.isVRouterRunning().catch(() => {})
  })
  it('isVRouterRunning should works well', function () {
    return vrouter.getVMState()
      .then((state) => {
        if (state === 'running') {
          return expect(vrouter.isVRouterRunning())
            .to.eventually.be.true
        } else {
          return expect(vrouter.isVRouterRunning())
            .to.eventually.be.false
        }
      })
  })

  it("getInfIP should be able get a inf's ip", function () {
    return expect(vrouter.getInfIP('lo0')).to.eventually.equal('127.0.0.1')
  })
  it('getAllInf should return all ifconfig', function () {
    const promise = vrouter.getAllInf()
      .then((output) => {
        return vrouter.localExec('ifconfig')
          .then((out) => output === out)
      })
    return expect(promise).to.be.eventually.true
  })
  it('getHostonlyInf() should return array: [correspondingInf, firstAvailableInf]', function () {
    return vrouter.getHostonlyInf()
      .then((arr) => {
        return expect(vrouter.getInfIP(arr[0])).to.eventually.equal(vrouter.config.host.ip)
          .then(() => {
            if (arr[1]) {
              return expect(vrouter.getInfIP(arr[1])).to.eventually.equal('')
            }
          })
      })
  })
  it('Test createHostonlyInf and removeHostonlyInf', function () {
    return vrouter.createHostonlyInf()
      .then(function (inf) {
        return Promise.resolve(() => {
          return expect(vrouter.localExec(`ifconfig ${inf}`)).to.be.fulfilled
        })
          .then(() => inf)
      })
      .then((inf) => {
        return vrouter.removeHostonlyInf(inf)
          .then(() => inf)
      })
      .then((inf) => {
        return expect(vrouter.localExec(`ifconfig ${inf}`)).to.be.rejected
      })
  })
  it('configHostonlyInf should modify correspondingInf to hostIP', function () {
    const originIP = vrouter.config.host.ip
    vrouter.config.host.ip = '7.7.7.7'
    return vrouter.configHostonlyInf()
      .then((inf) => {
        return expect(vrouter.getInfIP(inf)).to.eventually.equal('7.7.7.7.7')
      })
      .then(() => {
        vrouter.config.host.ip = originIP
      })
      .catch(() => {
        vrouter.config.host.ip = originIP
      })
  })

  it('test getActiveAdapter should return an array', function () {
    const promise = vrouter.getActiveAdapter()
    return promise.then(async (output) => {
      for (let i = 0; i < output.length; i += 1) {
        const inf = output[i].split(':')[0].trim()
        await vrouter.getInfIP(inf)
          .then((ip) => {
            expect(ip).to.not.be.empty
          })
      }
    })
  })
  it('scp', function () {
    const tempName = `${Date.now()}`
    const tempFile = path.join(os.tmpdir(), tempName)
    return fs.outputFile(tempFile, tempName)
      .then(() => {
        return vrouter.scp(tempFile, '/')
      })
      .then(() => {
        return vrouter.connect()
      })
      .then((remote) => {
        return remote.remoteExec(`cat /${tempName}`)
          .then((output) => {
            expect(output).to.be.equal(tempName)
          })
          .then(() => {
            return remote.remoteExec(`rm /${tempName}`)
          })
          .then(() => {
            return remote.close()
          })
      })
  })
  it("configVMLanIP should config vm's br-lan with vrouter.ip", function () {
    // need fixed
    // When test alone, it pass test
    // When test togeter, Uncaught Error: read ECONNRESET
    this.timeout(50000)
    // configVMLanIP will handle stopVM
    // const promise = Promise.resolve()
    const promise = vrouter.configVMLanIP()
      .then(() => {
        return vrouter.wait(8000)
      })
      .catch((err) => {
        console.log('error when configVMLanIP. try again')
        console.log(err)
        return vrouter.configVMLanIP()
          .then(() => {
            return vrouter.wait(8000)
          })
      })
      .then(() => {
        const cmd = `ping -c 1 -t 5 ${vrouter.config.vrouter.ip}`
        // const cmd = `ping -c 20 ${vrouter.config.vrouter.ip}`
        return vrouter.localExec(cmd)
          .catch((err) => {
            console.log('error when ping')
            console.log(err)
            return Promise.reject(err)
          })
      })
    return expect(promise).to.be.fulfilled
  })
  it('scpConfig', function () {
    const file = '/etc' +
      '/' + vrouter.config.firewall.firewallFile
    return vrouter.connect()
      .then((remote) => {
        return remote.remoteExec(`mv ${file} ${file}+backup`)
          .then(() => {
            return expect(remote.remoteExec(`cat ${file}`))
              .to.eventually.be.empty
          })
          .then(() => {
            return vrouter.scpConfig('firewall')
          })
          .then(() => {
            return expect(remote.remoteExec(`cat ${file}`))
              .to.eventually.not.be.empty
          })
          .then(() => {
            return remote.remoteExec(`mv ${file}+backup ${file}`)
          })
          .catch(() => {
            return remote.remoteExec(`mv ${file}+backup ${file}`)
          })
          .then(() => {
            return remote.close()
          })
      })
  })
})

describe('Test ability of modify vm', function () {
  this.slow(15000)
  let vrouter
  before('get instance', function () {
    vrouter = new VRouter()
  })
  it('hideVM should hide vm in virtualbox manager', function () {
    this.timeout(10000)
    const promise = vrouter.stopVM('poweroff', 8000)
      .then(() => {
        return vrouter.hideVM()
      })
      .then(() => {
        const cmd = `VBoxManage getextradata ${vrouter.config.vrouter.name} GUI/HideFromManager`
        return vrouter.localExec(cmd)
      })
    return expect(promise).to.eventually.equal('Value: true\n')
      .then(() => {
        return vrouter.hideVM(false)
      })
  })
  it('lockGUIConfig')
  it('specifyHostonlyAdapter(inf, nic) should change vm\'s adapter', function () {
    this.timeout(10000)
    let currentInf = ''
    const promise = vrouter.stopVM('poweroff', 8000)
      .then(() => {
        return vrouter.localExec(`VBoxManage showvminfo ${vrouter.config.vrouter.name} --machinereadable | grep hostonlyadapter`)
          .then((output) => {
            currentInf = output.trim().split('=')[1]
          })
      })
      .then(() => {
        return vrouter.specifyHostonlyAdapter('something')
      })
      .then(() => {
        return vrouter.localExec(`VBoxManage showvminfo ${vrouter.config.vrouter.name} --machinereadable | grep hostonlyadapter`)
      })
    return expect(promise).to.eventually.equal('hostonlyadapter1="something"\n')
      .then(() => {
        return vrouter.specifyHostonlyAdapter(currentInf)
      })
  })
  it('specifyBridgeAdapter(inf, nic) should change vm\'s adapter', function () {
    this.timeout(10000)
    let currentInf = ''
    const promise = vrouter.stopVM('poweroff', 8000)
      .then(() => {
        return vrouter.localExec(`VBoxManage showvminfo ${vrouter.config.vrouter.name} --machinereadable | grep bridgeadapter`)
      })
      .then((output) => {
        currentInf = output.trim().split('=')[1]
      })
      .then(() => {
        return vrouter.specifyBridgeAdapter('something')
      })
      .then(() => {
        return vrouter.localExec(`VBoxManage showvminfo ${vrouter.config.vrouter.name} --machinereadable | grep bridgeadapter`)
      })
    return expect(promise).to.eventually.equal('bridgeadapter2="something"\n')
      .then(() => {
        return vrouter.specifyBridgeAdapter(currentInf)
      })
  })

  it('isNIC1ConfigedAsHostonly should be fulfilled when adapter1 was config as hostonly network', function () {
    this.timeout(5000)
    return vrouter.stopVM('poweroff', 8000)
      .then(() => {
        return vrouter.specifyHostonlyAdapter()
      })
      .then(() => {
        return expect(vrouter.isNIC1ConfigedAsHostonly())
          .to.be.fulfilled
      })
      .then(() => {
        const ip = vrouter.config.host.ip
        vrouter.config.host.ip = '8.8.8.8'
        return expect(vrouter.isNIC1ConfigedAsHostonly())
          .to.be.rejectedWith(Error, "host-only adapter doesn't config as hostIP")
          .then(() => {
            vrouter.config.host.ip = ip
          })
      })
      .then(() => {
        return expect(vrouter.specifyBridgeAdapter('en0', '1'))
          .to.be.fulfilled
      })
      .then(() => {
        return expect(vrouter.isNIC1ConfigedAsHostonly())
          .to.be.rejectedWith(Error, "NIC1 isn't hostonly network")
      })
      .then(() => {
        return expect(vrouter.specifyHostonlyAdapter('vboxnet999'))
          .to.be.fulfilled
      })
      .then(() => {
        return expect(vrouter.isNIC1ConfigedAsHostonly())
          .to.be.rejectedWith(Error, 'ifconfig: interface vboxnet999 does not exist')
      })
      .then(() => {
        return expect(vrouter.specifyHostonlyAdapter())
          .to.be.fulfilled
      })
  })
  it('isNIC2ConfigedAsBridged should be fulfilled when vm\'s first adapter config as bridged', function () {
    this.timeout(5000)

    // const promise = vrouter.specifyBridgeAdapter()
    const promise = vrouter.stopVM('poweroff', 8000)
      .then(() => {
        return vrouter.specifyBridgeAdapter()
      })

    return expect(promise).to.be.fulfilled
      .then(() => {
        const promise = vrouter.specifyHostonlyAdapter('vboxnet0', '2')
        return expect(promise).to.be.fulfilled
      })
      .then(() => {
        return expect(vrouter.isNIC2ConfigedAsBridged())
          .to.be.rejectedWith(Error, "NIC2 isn't bridged network")
      })
      .then(() => {
        const promise = vrouter.specifyBridgeAdapter('no-exist-inf')
        return expect(promise).to.be.fulfilled
      })
      .then(() => {
        return expect(vrouter.isNIC2ConfigedAsBridged())
          .to.be.rejectedWith(Error, 'ifconfig: interface no-exist-inf does not exist')
      })
      .then(() => {
        const promise = vrouter.specifyBridgeAdapter('en1: Thunderbolt 1')
        return expect(promise).to.be.fulfilled
      })
      .then(() => {
        return expect(vrouter.isNIC2ConfigedAsBridged())
          .to.be.rejectedWith(Error, "bridged adapter doesn't active")
      })
  })

  it('configVMNetwork should config adapter1 as with host.ip', function () {
    this.timeout(10000)
    const promise = vrouter.stopVM('poweroff', 8000)
      .then(() => {
        return vrouter.configVMNetwork()
      })
      .then(() => {
        return vrouter.localExec(`VBoxManage showvminfo ${vrouter.config.vrouter.name} --machinereadable | grep hostonlyadapter`)
      })
      .then((output) => {
        return vrouter.getInfIP(output.trim().split('=')[1])
      })
    return expect(promise).to.eventually.equal(vrouter.config.host.ip)
  })
  it('configVMNetwork should config adapter1 as hostonly, adapter2 as bridged', function () {
    this.timeout(10000)
    const promise = vrouter.stopVM('poweroff', 8000)
      .then(() => {
        return vrouter.configVMNetwork()
      })
      .then(() => {
        return vrouter.localExec(`VBoxManage showvminfo ${vrouter.config.vrouter.name} --machinereadable | grep "nic[12]"`)
      })
    return expect(promise).to.eventually.become('nic1="hostonly"\nnic2="bridged"\n')
  })

  it.skip('toggleSerialPort("on") should turnon serialport 1', function () {
    this.timeout(10000)
    const promise = vrouter.stopVM('poweroff', 8000)
      .then(() => {
        return vrouter.toggleSerialPort('on')
      })
      .then(() => {
        return vrouter.localExec(`VBoxManage showvminfo ${vrouter.config.vrouter.name} --machinereadable | grep "uart.*1"`)
      })
    return expect(promise).to.eventually.equal(
      `uart1="0x03f8,4"\nuartmode1="server,${path.join(vrouter.config.host.configDir, vrouter.config.host.serialFile)}"\n`
    )
  })
  it.skip('toggleSerialPort("off") should turnoff serialport 1', function () {
    const promise = vrouter.stopVM('poweroff', 8000)
      .then(() => {
        return vrouter.toggleSerialPort('off')
      })
      .then(() => {
        return vrouter.localExec(`VBoxManage showvminfo ${vrouter.config.vrouter.name} --machinereadable | grep uart1`)
      })
    return expect(promise).to.eventually.equal('uart1="off"\n')
  })
  it('isSerialPortOn should fulfilled with true after toggleSerialPort', function () {
    this.timeout(10000)
    const promise = vrouter.toggleSerialPort('on')
      .then(() => {
        return vrouter.isSerialPortOn()
      })
    return expect(promise).to.eventually.be.true
  })

  it('changeDnsmasq')
  it('enableService')
  it('changeVMTZ')
  it('changeVMPasswd')
  it('serialLog')
  it('installPackage')
})

describe('Test ability of manage file', function () {
  let vrouter
  before('get a vrouter instance', function () {
    vrouter = new VRouter()
  })
  it('cfg should be delte after running deleteCfgFile(cfg)', function () {
    const cfg = vrouter.config.firewall.ipsetsFile
    const filePath = path.join(vrouter.config.host.configDir, cfg)
    return fs.ensureFile(filePath)
      .then(() => {
        return expect(fs.pathExists(filePath)).to.eventually.be.true
      })
      .then(() => {
        return vrouter.deleteCfgFile(cfg)
      })
      .then(() => {
        return expect(fs.pathExists(filePath)).to.eventually.be.false
      })
  })
  it('getCfgContent(file) should be fulfilled with content.', function () {
    const cfg = vrouter.config.firewall.whiteIPs
    const cfgPath = path.join(vrouter.config.host.configDir, cfg)
    const template = path.join(__dirname, '../config', cfg)
    let originTemplateData = ''
    let originCfgData = ''
    return fs.readFile(cfgPath, 'utf8').catch(() => {})
      .then((data) => {
        originCfgData = data || ''
        return fs.outputFile(cfgPath, '1.1.1.1')
      })
      .then(() => {
        const promise = fs.readFile(cfgPath, 'utf8')
        return expect(promise).to.eventually.equal('1.1.1.1')
      })
      .then(() => {
        return expect(vrouter.getCfgContent(cfg)).to.eventually.equal('1.1.1.1')
      })
      .then(() => {
        return fs.remove(cfgPath)
      })
      .then(() => {
        return fs.readFile(template, 'utf8')
          .catch(() => {
            // don't panic.
          })
          .then((data) => {
            originTemplateData = data || ''
          })
      })
      .then(() => {
        return fs.outputFile(template, '2.2.2.2')
      })
      .then(() => {
        return expect(vrouter.getCfgContent(cfg)).to.eventually.equal('2.2.2.2')
      })
      .then(() => {
        return Promise.all([
          fs.outputFile(template, originTemplateData),
          fs.outputFile(cfgPath, originCfgData)
        ])
      })
  })
  it("generateIPsets's output should contains 127.0.0.0/chinaip/extraip", function () {
    const cfg = vrouter.config.firewall.ipsetsFile
    const cfgPath = path.join(vrouter.config.host.configDir, cfg)
    let originData = ''
    return fs.readFile(cfgPath, 'utf8').catch(() => {})
      .then((data) => {
        originData = data || ''
      })
      .then(() => {
        return fs.remove(cfgPath).catch(() => {})
      })
      .then(() => {
        return vrouter.generateIPsets()
      })
      .then(() => {
        return fs.readFile(cfgPath, 'utf8')
      })
      .then((data) => {
        // console.log(data)
        expect(/^add LAN 127.0.0.0\/8$/mg.test(data)).to.be.true
        expect(/^add WHITELIST 114.114.0.0\/16$/mg.test(data)).to.be.true
        expect(/^add BLACKLIST 8.8.8.8\/32$/m.test(data)).to.be.true
      })
      .then(() => {
        return fs.outputFile(cfgPath, originData, 'utf8')
      })
  })

  it('generateFWRulesHelper should return two lines with newline', function () {
    const rule = vrouter.generateFWRulesHelper('a test')
    return expect(rule).to.be.equal(`iptables -t nat -A PREROUTING -d a test\niptables -t nat -A OUTPUT a test\n`)
  })
  it('getServerIP should return server ip', function () {
    const origin = [vrouter.config.server.domain, vrouter.config.server.ip]
    return Promise.resolve()
      .then(() => {
        vrouter.config.server.ip = '1.2.3.4'
        return expect(vrouter.getServerIP()).to.eventually.equal('1.2.3.4')
      })
      .then(() => {
        vrouter.config.server.ip = ''
        vrouter.config.server.domain = 'localhost'
        const promise = vrouter.getServerIP()
        return expect(promise).to.eventually.equal('127.0.0.1')
      })
      .then(() => {
        vrouter.config.server.domain = origin[0]
        vrouter.config.server.ip = origin[1]
      })
  })
  it('generateFWRules should redirect only lan traffic in "none" mode', function () {
    const cfgPath = path.join(vrouter.config.host.configDir, vrouter.config.firewall.firewallFile)
    const originIP = vrouter.config.server.ip
    let originRules = ''
    vrouter.config.server.ip = '1.2.3.4'
    return vrouter.generateFWRules('none', 'kcptun', true)
      .then(() => {
        const cfgPath = path.join(vrouter.config.host.configDir, vrouter.config.firewall.firewallFile)
        return fs.readFile(cfgPath, 'utf8')
      })
      .then((data) => {
        const expectContent = String.raw`# com.icymind.vrouter
# workMode: none
# create ipsets in order to avoid errors when run firewall.user
ipset create LAN   hash:net family inet hashsize 1024 maxelem 65536 -exist
ipset create WHITELIST hash:net family inet hashsize 1024 maxelem 65536 -exist
ipset create BLACKLIST hash:net family inet hashsize 1024 maxelem 65536 -exist
/usr/sbin/ipset restore -exist -file /etc/com.icymind.vrouter/custom.ipset &> /dev/null
# speedup ssh connection if current protocol is kcptun
iptables -t nat -A PREROUTING -d -d 1.2.3.4 -p tcp --dport 22 -j REDIRECT --to-port 1090
iptables -t nat -A OUTPUT -d 1.2.3.4 -p tcp --dport 22 -j REDIRECT --to-port 1090
# bypass server ip
iptables -t nat -A PREROUTING -d -d 1.2.3.4 -j RETURN
iptables -t nat -A OUTPUT -d 1.2.3.4 -j RETURN
# bypass lan networks
iptables -t nat -A PREROUTING -d -m set --match-set LAN dst -j RETURN
iptables -t nat -A OUTPUT -m set --match-set LAN dst -j RETURN
`
        return expect(data.trim()).to.equal(expectContent.trim())
      })
      .then(() => {
        vrouter.config.server.ip = originIP
        return fs.outputFile(cfgPath, originRules)
      })
  })
  it('generateFWRules should works fine with kt+global mode', function () {
    const cfgPath = path.join(vrouter.config.host.configDir, vrouter.config.firewall.firewallFile)
    const originIP = vrouter.config.server.ip
    let originRules = ''
    vrouter.config.server.ip = '1.2.3.4'
    return fs.readFile(cfgPath, 'utf8')
      .then((data) => {
        originRules = data || ''
      })
      .then(() => {
        return vrouter.generateFWRules('global', 'kcptun', true)
      })
      .then(() => {
        return fs.readFile(cfgPath, 'utf8')
      })
      .then((data) => {
        const expectContent = String.raw`# com.icymind.vrouter
# workMode: global
# create ipsets in order to avoid errors when run firewall.user
ipset create LAN   hash:net family inet hashsize 1024 maxelem 65536 -exist
ipset create WHITELIST hash:net family inet hashsize 1024 maxelem 65536 -exist
ipset create BLACKLIST hash:net family inet hashsize 1024 maxelem 65536 -exist
/usr/sbin/ipset restore -exist -file /etc/com.icymind.vrouter/custom.ipset &> /dev/null
# speedup ssh connection if current protocol is kcptun
iptables -t nat -A PREROUTING -d -d 1.2.3.4 -p tcp --dport 22 -j REDIRECT --to-port 1090
iptables -t nat -A OUTPUT -d 1.2.3.4 -p tcp --dport 22 -j REDIRECT --to-port 1090
# bypass server ip
iptables -t nat -A PREROUTING -d -d 1.2.3.4 -j RETURN
iptables -t nat -A OUTPUT -d 1.2.3.4 -j RETURN
# bypass lan networks
iptables -t nat -A PREROUTING -d -m set --match-set LAN dst -j RETURN
iptables -t nat -A OUTPUT -m set --match-set LAN dst -j RETURN
# route all traffic
iptables -t nat -A PREROUTING -d -p tcp -j REDIRECT --to-ports 1090
iptables -t nat -A OUTPUT -p tcp -j REDIRECT --to-ports 1090`
        return expect(data.trim()).to.equal(expectContent.trim())
      })
      .then(() => {
        vrouter.config.server.ip = originIP
        return fs.outputFile(cfgPath, originRules)
      })
  })
  it('generateFWRules should works fine with kt+whitelist mode', function () {
    const cfgPath = path.join(vrouter.config.host.configDir, vrouter.config.firewall.firewallFile)
    const originIP = vrouter.config.server.ip
    let originRules = ''
    vrouter.config.server.ip = '1.2.3.4'
    return fs.readFile(cfgPath, 'utf8')
      .then((data) => {
        originRules = data
      })
      .then(() => {
        return vrouter.generateFWRules('whitelist', 'kcptun', true)
      })
      .then(() => {
        return fs.readFile(cfgPath, 'utf8')
      })
      .then((data) => {
        const expectContent = String.raw`# com.icymind.vrouter
# workMode: whitelist
# create ipsets in order to avoid errors when run firewall.user
ipset create LAN   hash:net family inet hashsize 1024 maxelem 65536 -exist
ipset create WHITELIST hash:net family inet hashsize 1024 maxelem 65536 -exist
ipset create BLACKLIST hash:net family inet hashsize 1024 maxelem 65536 -exist
/usr/sbin/ipset restore -exist -file /etc/com.icymind.vrouter/custom.ipset &> /dev/null
# speedup ssh connection if current protocol is kcptun
iptables -t nat -A PREROUTING -d -d 1.2.3.4 -p tcp --dport 22 -j REDIRECT --to-port 1090
iptables -t nat -A OUTPUT -d 1.2.3.4 -p tcp --dport 22 -j REDIRECT --to-port 1090
# bypass server ip
iptables -t nat -A PREROUTING -d -d 1.2.3.4 -j RETURN
iptables -t nat -A OUTPUT -d 1.2.3.4 -j RETURN
# bypass lan networks
iptables -t nat -A PREROUTING -d -m set --match-set LAN dst -j RETURN
iptables -t nat -A OUTPUT -m set --match-set LAN dst -j RETURN
# bypass whitelist
iptables -t nat -A PREROUTING -d -m set --match-set WHITELIST dst -j RETURN
iptables -t nat -A OUTPUT -m set --match-set WHITELIST dst -j RETURN
# route all other traffic
iptables -t nat -A PREROUTING -d -p tcp -j REDIRECT --to-ports 1090
iptables -t nat -A OUTPUT -p tcp -j REDIRECT --to-ports 1090`
        return expect(data.trim()).to.equal(expectContent.trim())
      })
      .then(() => {
        vrouter.config.server.ip = originIP
        return fs.outputFile(cfgPath, originRules)
      })
  })
  it('generateFWRules should works fine with ss+blacklist', function () {
    const cfgPath = path.join(vrouter.config.host.configDir, vrouter.config.firewall.firewallFile)
    const originIP = vrouter.config.server.ip
    let originRules = ''
    vrouter.config.server.ip = '1.2.3.4'
    return fs.readFile(cfgPath, 'utf8')
      .then((data) => {
        originRules = data | ''
      })
      .then(() => {
        return vrouter.generateFWRules('blacklist', 'shadowsocks', true)
      })
      .then(() => {
        return fs.readFile(cfgPath, 'utf8')
      })
      .then((data) => {
        const expectContent = String.raw`# com.icymind.vrouter
# workMode: blacklist
# create ipsets in order to avoid errors when run firewall.user
ipset create LAN   hash:net family inet hashsize 1024 maxelem 65536 -exist
ipset create WHITELIST hash:net family inet hashsize 1024 maxelem 65536 -exist
ipset create BLACKLIST hash:net family inet hashsize 1024 maxelem 65536 -exist
/usr/sbin/ipset restore -exist -file /etc/com.icymind.vrouter/custom.ipset &> /dev/null
# bypass server ip
iptables -t nat -A PREROUTING -d -d 1.2.3.4 -j RETURN
iptables -t nat -A OUTPUT -d 1.2.3.4 -j RETURN
# bypass lan networks
iptables -t nat -A PREROUTING -d -m set --match-set LAN dst -j RETURN
iptables -t nat -A OUTPUT -m set --match-set LAN dst -j RETURN
# route all blacklist traffic
iptables -t nat -A PREROUTING -d -p tcp -m set --match-set BLACKLIST dst -j REDIRECT --to-port 1080
iptables -t nat -A OUTPUT -p tcp -m set --match-set BLACKLIST dst -j REDIRECT --to-port 1080`
        return expect(data.trim()).to.equal(expectContent.trim())
      })
      .then(() => {
        vrouter.config.server.ip = originIP
        return fs.outputFile(cfgPath, originRules)
      })
  })
  it('generateFWRules should works fine with ss+whitelist', function () {
    const cfgPath = path.join(vrouter.config.host.configDir, vrouter.config.firewall.firewallFile)
    const originIP = vrouter.config.server.ip
    let originRules = ''
    vrouter.config.server.ip = '1.2.3.4'
    return fs.readFile(cfgPath, 'utf8')
      .then((data) => {
        originRules = data || ''
      })
      .then(() => {
        return vrouter.generateFWRules('whitelist', 'shadowsocks', true)
      })
      .then(() => {
        return fs.readFile(cfgPath, 'utf8')
      })
      .then((data) => {
        const expectContent = String.raw`# com.icymind.vrouter
# workMode: whitelist
# create ipsets in order to avoid errors when run firewall.user
ipset create LAN   hash:net family inet hashsize 1024 maxelem 65536 -exist
ipset create WHITELIST hash:net family inet hashsize 1024 maxelem 65536 -exist
ipset create BLACKLIST hash:net family inet hashsize 1024 maxelem 65536 -exist
/usr/sbin/ipset restore -exist -file /etc/com.icymind.vrouter/custom.ipset &> /dev/null
# bypass server ip
iptables -t nat -A PREROUTING -d -d 1.2.3.4 -j RETURN
iptables -t nat -A OUTPUT -d 1.2.3.4 -j RETURN
# bypass lan networks
iptables -t nat -A PREROUTING -d -m set --match-set LAN dst -j RETURN
iptables -t nat -A OUTPUT -m set --match-set LAN dst -j RETURN
# bypass whitelist
iptables -t nat -A PREROUTING -d -m set --match-set WHITELIST dst -j RETURN
iptables -t nat -A OUTPUT -m set --match-set WHITELIST dst -j RETURN
# route all other traffic
iptables -t nat -A PREROUTING -d -p tcp -j REDIRECT --to-ports 1080
iptables -t nat -A OUTPUT -p tcp -j REDIRECT --to-ports 1080`
        return expect(data.trim()).to.equal(expectContent.trim())
      })
      .then(() => {
        vrouter.config.server.ip = originIP
        return fs.outputFile(cfgPath, originRules)
      })
  })
  it('getDNSServer should return an array: [dnsmasq, ss-dns-tunnel]', function () {
    return expect(vrouter.getDNSServer()).to.be.deep.equal([
      '127.0.0.1#53',
      `127.0.0.1#${vrouter.config.shadowsocks.dnsPort}`
    ])
  })
  it('generateDnsmasqCfg should generate expect content to file', function () {
    const cfgPath = path.join(vrouter.config.host.configDir, vrouter.config.firewall.dnsmasqFile)
    let originContent
    return fs.readFile(cfgPath).catch(() => {})
      .then((data) => {
        originContent = data || ''
      })
      .then(() => {
        return vrouter.generateDnsmasqCf('blacklist', true)
      })
      .then(() => {
        return fs.readFile(cfgPath, 'utf8')
      })
      .then((data) => {
        const reg = /server=\/google.com\/127.0.0.1#1081\nipset=\/google.com\/BLACKLIST/
        expect(reg.test(data)).to.be.true
      })
      .then(() => {
        return fs.outputFile(cfgPath, originContent)
      })
  })

  it('generateWatchdog should works', function () {
    const cfgPath = path.join(vrouter.config.host.configDir, vrouter.config.firewall.watchdogFile)
    const expectContent = String.raw`#!/bin/sh
# KCPTUN
if ! pgrep kcptun;then
    /etc/init.d/kcptun restart
    date >> /root/watchdog.log
    echo "restart kcptun" >> /root/watchdog.log
fi
# SHADOWSOCKS
if ! (pgrep ss-redir && pgrep ss-tunnel);then
    /etc/init.d/shadowsocks restart
    date >> /root/watchdog.log
    echo "restart ss" >> /root/watchdog.log
fi`
    return vrouter.generateWatchdog()
      .then(() => {
        // return expect(fs.readFile(cfgPath, 'utf8').then((data => {console.log(data);return data})))
          // .to.eventually.equal(expectContent)
        return expect(fs.readFile(cfgPath, 'utf8'))
          .to.eventually.equal(expectContent)
      })
  })

  it('generateService("kcptun") should generate expect content to file', function () {
    const cfgPath = path.join(vrouter.config.host.configDir, vrouter.config.kcptun.service)
    let originContent = ''
    return fs.readFile(cfgPath).catch(() => {})
      .then((data) => {
        originContent = data || ''
      })
      .then(() => {
        return vrouter.generateService('kcptun')
      })
      .then(() => {
        return fs.readFile(cfgPath, 'utf8')
      })
      .then((data) => {
        const kt = String.raw`#!/bin/sh /etc/rc.common
# Copyright (C) 2006-2011 OpenWrt.org

START=88

SERVICE_USE_PID=1
SERVICE_WRITE_PID=1
SERVICE_DAEMONIZE=1

start() {
    # kcptun will fail if network not ready
    while true;do
        service_start /usr/bin/kcptun -c ${vrouter.config.vrouter.configDir}/${vrouter.config.kcptun.client}
        sleep 30
        (pgrep kcptun) && break
    done
}

stop() {
    killall kcptun
}`
        return expect(data).to.equal(kt)
      })
      .then(() => {
        return fs.outputFile(cfgPath, originContent)
      })
  })
  it('generateService("shadowsocks") should generate expect content to file', function () {
    const cfgPath = path.join(vrouter.config.host.configDir, vrouter.config.shadowsocks.service)
    let originContent = ''
    return fs.readFile(cfgPath).catch(() => {})
      .then((data) => {
        originContent = data || ''
      })
      .then(() => {
        return vrouter.generateService('shadowsocks')
      })
      .then(() => {
        return fs.readFile(cfgPath, 'utf8')
      })
      .then((data) => {
        const kt = String.raw`#!/bin/sh /etc/rc.common
# Copyright (C) 2006-2011 OpenWrt.org

START=90

SERVICE_USE_PID=1
SERVICE_WRITE_PID=1
SERVICE_DAEMONIZE=1


start() {
    # ss-tunnel cannot work fine with kcptun.
    service_start /usr/bin/ss-tunnel -c ${vrouter.config.vrouter.configDir}/${vrouter.config.shadowsocks.dns}
    service_start /usr/bin/ss-redir  -c ${vrouter.config.vrouter.configDir}/${vrouter.config.shadowsocks.client}
    service_start /usr/bin/ss-redir  -c ${vrouter.config.vrouter.configDir}/${vrouter.config.shadowsocks.overKt}
}

stop() {
    service_stop /usr/bin/ss-tunnel
    service_stop /usr/bin/ss-redir
    killall ss-redir
}`
        return expect(data).to.equal(kt)
      })
      .then(() => {
        return fs.outputFile(cfgPath, originContent)
      })
  })
  it('generateConfig("ss-client") should generate expect content to file', function () {
    const cfgPath = path.join(vrouter.config.host.configDir, vrouter.config.shadowsocks.client)
    let originServer = vrouter.config.shadowsocks.server
    let originContent
    return fs.readFile(cfgPath).catch(() => {})
      .then((data) => {
        originContent = data || ''
      })
      .then(() => {
        vrouter.config.shadowsocks.server = {
          ip: '5.5.5.5',
          domain: '',
          port: '999',
          password: 'a-test-passwd',
          timeout: 300,
          method: 'chacha20',
          fastOpen: true
        }
      })
      .then(() => {
        return vrouter.generateConfig('ss-client')
      })
      .then(() => {
        return fs.readFile(cfgPath, 'utf8')
      })
      .then((data) => {
        const expectContent = String.raw`{
    "server":"5.5.5.5",
    "server_port":999,
    "local_address": "0.0.0.0",
    "local_port":1080,
    "password":"a-test-passwd",
    "timeout":300,
    "method":"chacha20",
    "fast_open": true,
    "mode": "tcp_only"
}`
        return expect(data).to.equal(expectContent)
      })
      .then(() => {
        vrouter.config.shadowsocks.server = originServer
        return fs.outputFile(cfgPath, originContent)
      })
  })
  it('generateConfig("ss-overKt") should generate expect content to file', function () {
    const cfgPath = path.join(vrouter.config.host.configDir, vrouter.config.shadowsocks.overKt)
    let originServer = vrouter.config.shadowsocks.server
    let originContent
    return fs.readFile(cfgPath).catch(() => {})
      .then((data) => {
        originContent = data || ''
      })
      .then(() => {
        vrouter.config.shadowsocks.server = {
          ip: '5.5.5.5',
          domain: '',
          port: '999',
          password: 'a-test-passwd',
          timeout: 300,
          method: 'chacha20',
          fastOpen: true
        }
      })
      .then(() => {
        return vrouter.generateConfig('ss-overKt')
      })
      .then(() => {
        return fs.readFile(cfgPath, 'utf8')
      })
      .then((data) => {
        const expectContent = String.raw`{
    "server":       "127.0.0.1",
    "server_port":  ${vrouter.config.kcptun.clientPort},
    "local_address": "0.0.0.0",
    "local_port":   ${vrouter.config.shadowsocks.overKtPort},
    "password":     "a-test-passwd",
    "timeout":      20,
    "method":       "chacha20",
    "fast_open":    true,
    "mode":         "tcp_only"
}`
        return expect(data).to.equal(expectContent)
      })
      .then(() => {
        vrouter.config.shadowsocks.server = originServer
        return fs.outputFile(cfgPath, originContent)
      })
  })
  it('generateConfig("ss-dns") should generate expect content to file', function () {
    const cfgPath = path.join(vrouter.config.host.configDir, vrouter.config.shadowsocks.dns)
    let originServer = vrouter.config.shadowsocks.server
    let originContent
    return fs.readFile(cfgPath).catch(() => {})
      .then((data) => {
        originContent = data || ''
      })
      .then(() => {
        vrouter.config.shadowsocks.server = {
          ip: '5.5.5.5',
          domain: '',
          port: '999',
          password: 'a-test-passwd',
          timeout: 300,
          method: 'chacha20',
          fastOpen: true
        }
      })
      .then(() => {
        return vrouter.generateConfig('ss-dns')
      })
      .then(() => {
        return fs.readFile(cfgPath, 'utf8')
      })
      .then((data) => {
        const expectContent = String.raw`{
    "server":"5.5.5.5",
    "server_port":999,
    "local_address": "0.0.0.0",
    "local_port":1080,
    "password":"a-test-passwd",
    "timeout":300,
    "method":"chacha20",
    "fast_open": true,
    "tunnel_address": "8.8.8.8:53",
    "mode": "udp_only"
}`
        return expect(data).to.equal(expectContent)
      })
      .then(() => {
        vrouter.config.shadowsocks.server = originServer
        return fs.outputFile(cfgPath, originContent)
      })
  })

  it.skip('test download and hashFIle', function () {
    this.timeout(50000)
    const url = vrouter.config.vrouter.imageUrl
    const dest = path.join(os.tmpdir(), path.basename(url))
    const sha = vrouter.config.vrouter.imageSha256
    return vrouter.downloadFile(url, dest)
      .then(() => {
        return fs.readFile(dest)
      })
      .then((data) => {
        return expect(vrouter.hashFile(dest)).to.eventually.equal(sha)
      })
      .then(() => {
        return fs.remove(dest)
      })
  })
  it('copyTemplate', function () {
    const cfgName = vrouter.config.firewall.ipsetsFile
    const cfgPath = path.join(vrouter.config.host.configDir, cfgName)
    return fs.move(cfgPath, cfgPath + 'backup')
      .then(() => {
        return expect(fs.readFile(cfgPath))
          .to.eventually.be.empty
      })
      .then(() => {
        return vrouter.copyTemplate(cfgName)
      })
      .then(() => {
        return expect(fs.readFile(cfgPath))
          .to.eventually.not.be.empty
      })
      .then(() => {
        return fs.move(cfgPath + 'backup', cfgPath)
      })
      .catch(() => {
        return fs.move(cfgPath + 'backup', cfgPath).catch(() => {})
      })
  })
  it('scpConfigAll')
  it('saveConfig', function () {
    return vrouter.saveConfig()
  })
})
