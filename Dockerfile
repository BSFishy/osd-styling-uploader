FROM node:16

RUN apt-get update && \
     apt-get install -y git

# Clone Dashboards
RUN mkdir -p /dashboards && cd /dashboards && git clone https://github.com/opensearch-project/OpenSearch-Dashboards.git .
RUN mkdir -p /dashboards/plugins/observability && cd /dashboards/plugins/observability && git clone https://github.com/opensearch-project/dashboards-observability.git .
RUN mkdir -p /dashboards/plugins/reporting && cd /dashboards/plugins/reporting && git clone https://github.com/opensearch-project/dashboards-reporting.git .
RUN mkdir -p /dashboards/plugins/visualizations && cd /dashboards/plugins/visualizations && git clone https://github.com/opensearch-project/dashboards-visualizations.git .
RUN mkdir -p /dashboards/plugins/query-workbench && cd /dashboards/plugins/query-workbench && git clone https://github.com/opensearch-project/dashboards-query-workbench.git .
RUN mkdir -p /dashboards/plugins/maps && cd /dashboards/plugins/maps && git clone https://github.com/opensearch-project/dashboards-maps.git .
RUN mkdir -p /dashboards/plugins/anomaly-detection && cd /dashboards/plugins/anomaly-detection && git clone https://github.com/opensearch-project/anomaly-detection-dashboards-plugin.git .
RUN mkdir -p /dashboards/plugins/ml-commons && cd /dashboards/plugins/ml-commons && git clone https://github.com/opensearch-project/ml-commons-dashboards.git .
RUN mkdir -p /dashboards/plugins/index-management && cd /dashboards/plugins/index-management && git clone https://github.com/opensearch-project/index-management-dashboards-plugin.git .
RUN mkdir -p /dashboards/plugins/notifications && cd /dashboards/plugins/notifications && git clone https://github.com/opensearch-project/dashboards-notifications.git .
RUN mkdir -p /dashboards/plugins/alerting && cd /dashboards/plugins/alerting && git clone https://github.com/opensearch-project/alerting-dashboards-plugin.git .
RUN mkdir -p /dashboards/plugins/security-analytics && cd /dashboards/plugins/security-analytics && git clone https://github.com/opensearch-project/security-analytics-dashboards-plugin.git .
RUN mkdir -p /dashboards/plugins/security && cd /dashboards/plugins/security && git clone https://github.com/opensearch-project/security-dashboards-plugin.git .
RUN mkdir -p /dashboards/plugins/search-relevance && cd /dashboards/plugins/search-relevance && git clone https://github.com/opensearch-project/dashboards-search-relevance.git .

COPY . /uploader
WORKDIR /uploader

RUN corepack enable
RUN yarn install
RUN yarn build

ENTRYPOINT yarn start /dashboards
