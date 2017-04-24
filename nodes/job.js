URI = require('urijs');
util = require('util');

module.exports = function(RED) {
    "use strict";

    /**
     * Run a job in a Jenkins instance
     * @param {string} config - The Node-RED node configuration
     */
    function job(config) {
        RED.nodes.createNode(this, config);

        this.creds = config.creds
        this.url = config.url;

        this.job = config.job;
        this.jobType = config.jobType;
        this.parameters = config.parameters;

        let node = this;
        this.on('input', function(msg) {
            let jenkins = require('jenkins');
            let jenkinsInstance = null

            {
                let url = new URI(node.url)
                  .username(RED.nodes.getNode(node.creds).credentials.username)
                  .password(RED.nodes.getNode(node.creds).credentials.password);

                let jenkinsConfig = {
                    baseUrl: url.toString(),
                    crumbIssuer: true,
                };

                jenkinsInstance = jenkins(jenkinsConfig);
            }

            this.log("Running job " + this.job + this.parameters)
            function getValue(type, value) {
                if (type === 'msg') {
                    return RED.util.getMessageProperty(msg, value);
                } else if (type === 'flow') {
                    return node.context().flow.get(value);
                } else if (type === 'global') {
                    return node.context().global.get(value);
                }
                return value;
            }

            let job = getValue(node.jobType, node.job)
            jenkinsInstance.job.build({name: job, parameters: this.parameters}, function(err, data) {
                if (err) {
                    node.status({ 
                                  fill: "red",
                                  shape: "dot",
                                  text: "Error running job" 
                                });
                    node.error("Error starting job " + this.job, err);
                    return
                }

                if (msg.payload.jenkins == undefined) msg.payload.jenkins = {}
                msg.payload.jenkins.buildNumber = data

                node.send(msg);
            });
        });
    }
    RED.nodes.registerType('jenkins-job', job);
};