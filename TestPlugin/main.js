const JsPlugin = require('@astorks/lib-smc/JsPlugin').default;
const ChatColor = require('@astorks/lib-smc/org/bukkit/ChatColor').default;
const PlayerJoinEvent = require('@astorks/lib-smc/org/bukkit/event/player/PlayerJoinEvent').default;
const ItemStack = require('@astorks/lib-smc/org/bukkit/inventory/ItemStack').default;
const Material = require('@astorks/lib-smc/org/bukkit/Material').default;
const Enchantment = require('@astorks/lib-smc/org/bukkit/enchantments/Enchantment').default;
const ByteStreams = require('@astorks/lib-smc/com/google/common/io/ByteStreams').default;
const EntityType = require('@astorks/lib-smc/org/bukkit/entity/EntityType').default;
const FireworkEffect = require('@astorks/lib-smc/org/bukkit/FireworkEffect').default;
const Color = require('@astorks/lib-smc/org/bukkit/Color').default;
const Sound = require('@astorks/lib-smc/org/bukkit/Sound').default;
const MinecraftVersions = require('@astorks/lib-smc/com/smc/version/MinecraftVersions').default;
const SmartInventory = require('@astorks/lib-smc/com/smc/smartinvs/SmartInventory').default;
const ItemBuilder = require('@astorks/lib-smc/com/smc/utils/ItemBuilder').default;
const SmartInventoryProvider = require('@astorks/lib-smc/com/smc/smartinvs/SmartInventoryProvider').default;
const CONFIG = require('./config.json');

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TestPlugin extends JsPlugin {

    onLoad() {
        if (CONFIG.debug) {
            console.log("[" + this.pluginName + "] onLoad()");
            console.log("[" + this.pluginName + "] Minecraft Version:", MinecraftVersions.RUNTIME_VERSION);
        }

        // MySQL example
        if (CONFIG.mysql.enabled) {
            this.mysqlConnection = this.mysqlFromConfig(CONFIG.mysql);
            this.mysqlConnection.openConnectionAsync(this.context.getJavaPlugin(), () => {
                let selectStatement = this.mysqlConnection.prepareStatement("SELECT * FROM Testing WHERE enabled = ?;");
                selectStatement.setBoolean(1, true);
                let result = selectStatement.executeQuery();
                while (result.next()) {
                    console.log(result.getInt("id"), result.getString("title"), result.getString("text"));
                }
                result.close();
                selectStatement.close();
            });
        }
    }

    onEnable() {
        if (CONFIG.debug) {
            console.log("[" + this.pluginName + "] onEnable()");
        }

        // register outgoing bungee message channel
        this.registerOutgoingPluginChannel('BungeeCord');

        // Register incoming bungee message channel
        this.registerIncomingPluginChannel('BungeeCord', this.onBungeeMessageReceived);

        // Register PlayerJoinEvent to a local method
        this.registerEvent(PlayerJoinEvent, this.onPlayerJoin);

        // // no-op event handler, this will cancel any event that is registered to it.
        // let noop = (l: any, e: any) => e.setCancelled(true);
        // // Register a bunch of block break / entity interact events and no-op them
        // this.registerEvent(EntityDamageEvent, noop);
        // this.registerEvent(BlockBreakEvent, noop);
        // this.registerEvent(BlockPlaceEvent, noop);
        // this.registerEvent(PlayerInteractEvent, noop);
        // this.registerEvent(PlayerInteractAtEntityEvent, noop);
        // this.registerEvent(PlayerInteractEntityEvent, noop);

        // Create a new command /hellojs
        let cmd = this.newCommand("hellojs");

        // Set the command executor to a local method.
        // Notice the .bind(this), it is important for the "this" scope to be this plugin.
        // We don't need to worry about this for events since it is handled for us inside the base JsPlugin class but we are interacting with the command directly so it is required.
        cmd.setExecutor(this.onHelloWorldCmdExecute.bind(this));

        // Register the command with the server
        this.registerCommand(cmd);
    }

    onDisable() {
        if (CONFIG.debug) {
            console.log("[" + this.pluginName + "] onDisable()");
        }

        this.unregisterOutgoingPluginChannel('BungeeCord');
        this.unregisterIncomingPluginChannel('BungeeCord');
    }

    onPlayerJoin(listener, event) {
        let player = event.getPlayer();

        if (CONFIG.fireworkOnJoin.enabled && player.hasPermission(CONFIG.fireworkOnJoin.requiredPermission)) {
            let fw = player.getWorld().spawnEntity(player.getLocation().add(0, 10, 0), EntityType.FIREWORK);
            let fwm = fw.getFireworkMeta();
            fwm.setPower(2);
            fwm.addEffect(FireworkEffect.builder().withColor(Color.BLUE).flicker(true).build());
            fw.setFireworkMeta(fwm);
            fw.detonate();
        }
        
        if (CONFIG.printDebugOnJoin) {
            player.sendMessage(this.setPlaceholders(player, ChatColor.DARK_AQUA.toString() + ChatColor.BOLD.toString() + "UUID: %player_uuid%"));
            player.sendMessage(this.setPlaceholders(player, ChatColor.DARK_AQUA.toString() + "World: %player_world%, Rank: %uperms_rank%"));
            player.sendMessage(ChatColor.GRAY.toString() + JSON.stringify({
                health: player.getHealth(),
                hunger: player.getFoodLevel(),
                position: {
                    x: player.getLocation().getX(),
                    y: player.getLocation().getY(),
                    z: player.getLocation().getZ()
                }
            }));
        }
    }
    onHelloWorldCmdExecute(sender, command, label, args) {
        const plugin = this;
        let inventory = SmartInventory.builder(this.context.getInventoryManager())
            .id("hellojs")
            .provider(new SmartInventoryProvider({
            init(player, contents) {
                if (contents) {
                    contents.fillBorders(SmartInventory.clickableItem(new ItemBuilder(new ItemStack(Material.BEDROCK))
                        .setDisplayName(" ")
                        .setLore([" "])
                        .build()));

                    contents.set(1, 1, SmartInventory.clickableItem(new ItemBuilder(new ItemStack(Material.GOLD_NUGGET))
                        .setDisplayName(ChatColor.DARK_AQUA + "Hello World")
                        .setLore(["Test the hello world command"])
                        .addEnchant(Enchantment.BINDING_CURSE, 1, true)
                        .build(), () => {
                        if (player != null) {
                            plugin.bungeeGetServer(player);
                            player.sendMessage("Hello from javascript!!!");
                            inventory.close(player);
                        }
                    }));

                    contents.set(1, 2, SmartInventory.clickableItem(new ItemBuilder(new ItemStack(Material.DIAMOND))
                        .setDisplayName(ChatColor.GREEN + "Hub Server")
                        .setLore(["Connect to the hub server"])
                        .build(), () => {
                        if (player != null) {
                            plugin.bungeeConnect(player, "hub");
                            inventory.close(player);
                        }
                    }));

                    contents.set(1, 3, SmartInventory.clickableItem(new ItemBuilder(new ItemStack(Material.IRON_INGOT))
                        .setDisplayName("Print Server Name")
                        .build(), () => {
                        if (player != null) {
                            player.sendMessage(plugin.setPlaceholders(player, "%server_name%"));
                            inventory.close(player);
                        }
                    }));

                    contents.set(1, 4, SmartInventory.clickableItem(new ItemBuilder(new ItemStack(Material.GOLD_INGOT))
                        .setDisplayName("Launch Firework")
                        .build(), () => {
                        if (player != null) {
                            let fw = player.getWorld().spawnEntity(player.getLocation().add(0, 10, 0), EntityType.FIREWORK);
                            let fwm = fw.getFireworkMeta();
                            fwm.setPower(2);
                            fwm.addEffect(FireworkEffect.builder().withColor(Color.BLUE).flicker(true).build());
                            fw.setFireworkMeta(fwm);
                            fw.detonate();
                        }
                    }));

                    // Sound.ENTITY_LIGHTNING_BOLT_THUNDER only exists in minecraft 1.13+?
                    // Check if runtime version is 1.13+
                    if (MinecraftVersions.RUNTIME_VERSION.isAfterOrEq(MinecraftVersions.v1_13)) {
                        contents.set(1, 5, SmartInventory.clickableItem(new ItemBuilder(new ItemStack(Material.TNT))
                            .setDisplayName("THUNDER")
                            .build(), () => {
                            plugin.server.getOnlinePlayers().forEach((_player) => {
                                _player.getWorld().playSound(_player.getLocation(), Sound.ENTITY_LIGHTNING_BOLT_THUNDER, 1, 1);
                            });
                        }));
                    }
                }
            }
        }))
            .size(3, 9)
            .title("Test Menu from Javascript!")
            .closeable(true)
            .build();
        inventory.open(sender);
        return false;
    }

    onBungeeMessageReceived(channel, player, message) {
        if (channel != "BungeeCord")
            return;
        let messageReader = ByteStreams.newDataInput(message);
        let subchannel = messageReader.readUTF();
        if (subchannel == "GetServer") {
            let serverName = messageReader.readUTF();
            console.log("RECEIVED BUNGEE MESSAGE, player: " + player.getName() + ", subchannel: " + subchannel + ", server: " + serverName);
        }
        else {
            console.log("RECEIVED BUNGEE MESSAGE, subchannel: " + subchannel + ", length: " + message.length);
        }
    }

    bungeeConnect(player, server) {
        console.log("[" + this.pluginName + "] Sending " + player.getName() + " to " + server + " server...");
        let connectMessage = ByteStreams.newDataOutput();
        connectMessage.writeUTF("Connect");
        connectMessage.writeUTF(server);
        player.sendPluginMessage(this.context.getJavaPlugin(), "BungeeCord", connectMessage.toByteArray());
    }

    bungeeGetServer(player) {
        let getServerMessage = ByteStreams.newDataOutput();
        getServerMessage.writeUTF("GetServer");
        player.sendPluginMessage(this.context.getJavaPlugin(), "BungeeCord", getServerMessage.toByteArray());
    }
}
exports.default = TestPlugin;