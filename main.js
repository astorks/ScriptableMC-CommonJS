let TestPlugin = require('./TestPlugin/main').default;

// Return an array of plugin types that should be loaded and enabled.
// Add any scriptable plugins you want to load and enable to this array.
// This must be the last javascript code executed.
[
    TestPlugin
]

/* Or you can load javascript plugins yourself like this */
/*
// Load the plugin and get a plugin context that
// can be used to interact with the plugin
let pluginContext = engine.loadPlugin(require('./TestPlugin/main').default);

// Unlike returning an array you will have to call
// enableAllPlugins to enable all loaded plugins
// or you can manually enable plugins by calling
// engine.enablePlugin(pluginContext);
engine.enableAllPlugins();
*/