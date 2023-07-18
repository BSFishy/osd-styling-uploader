# OS Styling Uploader

This project scans through all the custom styling in OpenSearch Dashboards (or any project really, but it's setup for OSD) and puts that data into an OpenSearch index.

## Setup

### Prerequisites

 * A newer version of Node
   * I used v18.16.0
 * Yarn
   * I used v1.22.19
 * Docker
   * I used v20.10.21
 * An OpenSearch instance
   * I used v2.8.0
 * An init service if you want to automate it to run at some time

### Configuring

Main configuration is done in a `.env` file.
A template is provided in [`.env.template`](.env.template).
You can rename that to `.env` and fill it out.

| Name | Required | Description |
| --- | --- | --- |
| `OPENSEARCH_CLIENT_URL` | Yes | This is the URL to use to connect to OpenSearch. |
| `OPENSEARCH_ALLOW_INSECURE` | No | This allows connecting to OpenSearch in an insecure environment. This is useful if you have OpenSearch and OSD on the same machine and don't expose OpenSearch to the public but have self-signed certificates setup with the security plugin. |
| `DEFAULT_PATH` | Yes | The default path to search for files in if a path isn't specified. |

### Running

Running this project is done by running the [`run.sh`](run.sh) script.
This will update the logs directory, rotating the entries and deleting old entries.
Next, it will start the [`Dockerfile`](Dockerfile).

The `Dockerfile` clones OSD, and all official OSD plugins into `/dashboards`.
It then builds and starts the program, which will scan through `/dashboards` for `.scss` files, pass them through `postcss` and uploads results to the OpenSearch instance you have running.

### Scheduling

To set the uploader on a schedule, you need to set it up with your init system.

I used systemd and my config looked like this:

`/etc/systemd/system/uploader.service` (Make sure to update your path to uploader)
```
[Unit]
Description=OSD CSS info uploader
Wants=uploader.timer

[Service]
Type=oneshot
ExecStart=/usr/bin/bash [path to uploader]/run.sh

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/uploader.timer`
```
[Unit]
Description=Start the uploader at an interval
Requires=uploader.service

[Timer]
Unit=uploader.service
OnCalendar=*-*-* 10:00:00

[Install]
WantedBy=timers.target
```

This config will start the uploader every day at 2AM PST.
