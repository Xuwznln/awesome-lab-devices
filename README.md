# awesome-lab-devices

Uni-Lab-OS 设备驱动包索引。`index.json` 列出可以一键装进 Edge 的驱动包；
[OpenLab](https://github.com/Xuwznln/OpenLab-site) 前端「驱动包」页默认从这里读取目录，
点「安装」即把 `spec` 交给连接中的 Uni-Lab-OS（调度权威转给 Host）安装，再按需重启 Host 或配成受管设备进程。

```text
浏览器 (OpenLab Web) ──GET──▶ raw.githubusercontent.com/…/awesome-lab-devices/main/index.json
        │
        └──POST /api/v1/driver-packages/install {spec, name}──▶ Uni-Lab-OS（调度权威 → Host）
                                                                  └─ 按 spec 下载源码归档（GitHub 用 codeload）
                                                                     pyproject 依赖用 uv 安装（缺 uv 回退 pip）
                                                                     扫描 @device → 台账 → 重启生效 / 子进程运行
```

## 收录的包

| 包 | 设备 | 说明 |
| --- | --- | --- |
| [materials_demo](https://github.com/Xuwznln/LabDeviceMaterialsDemo) | `material_bench_demo` `sample_rack_demo` | 位点与物料：host/slave 双进程、固定位点、出库装板与缺料回滚 |
| [workstation_demo](https://github.com/Xuwznln/LabDeviceWorkstationDemo) | `demo_workstation` `echo_reader` `io_mock_modbus` `serial_mock` `modbus_sensor` | 工作站：hardware_interface 共享通信端点（串口 + Modbus） |
| [lan_demo](https://github.com/Xuwznln/LabDeviceLanDemo) | `hub_node_demo` `status_reporter_demo` | 局域网双运行时：跨设备 @subscribe + call_device_action |
| [inventory_demo](https://github.com/Xuwznln/LabDeviceInventoryDemo) | `reagent_dispenser_demo` `reagent_store_demo` | 库存：入库、预留出库扣减、整任务缺料失败 |
| [lock_demo](https://github.com/Xuwznln/LabDeviceLockDemo) | `lock_auditor_demo` `lock_probe_demo` | 调度锁：动作锁、always_free、物料参数默认加锁 |
| [exception_demo](https://github.com/Xuwznln/LabDeviceExceptionDemo) | `fault_injector_demo` `exception_supervisor_demo` | 异常捕获、错误决策、失败传播 |
| [complex_workflow_demo](https://github.com/Xuwznln/LabDeviceComplexWorkflowDemo) | `virtual_reactor_demo` | 循环 / 条件 / 托管分装与库存结算 |

这七个都是 Uni-Lab-OS 官方演示包，`dependencies = []`。`spec` 固定在与 Uni-Lab-OS `tests/e2e/readme_demos.py`
相同的、验证过的提交上；demo 跟着核心改动后，两处一起更新。版本号以各仓库 `pyproject.toml` 为准（见 `index.json`）。

## 索引格式

`index.json`（结构见 [`schema.json`](./schema.json)）：

```json
{
  "schema": "awesome-lab-devices/v1",
  "updated_at": "2026-09-03",
  "packages": [
    {
      "name": "site_demo",
      "spec": "git+https://github.com/Xuwznln/LabDeviceSiteDemo.git",
      "version": "0.2.0",
      "description": "…",
      "homepage": "https://github.com/Xuwznln/LabDeviceSiteDemo",
      "devices": ["material_bench_demo", "sample_rack_demo"],
      "tags": ["demo", "sites"],
      "official": true,
      "category": "demo"
    }
  ]
}
```

- `name`：包的 `pyproject [project].name`。微后端装完按它登记台账（大小写、`-`/`_` 不敏感），
  所以必须和分发名一致。
- `spec`：交给 `POST /api/v1/driver-packages/install` 的来源——GitHub 仓库
  （`https://github.com/<owner>/<repo>[@<分支 | 标签 | 提交>]` 或 `git+https://github.com/<owner>/<repo>.git[@…]`），
  或 zip / tar.gz 归档地址。Uni-Lab-OS 下载源码树安装，不经 `pip install` 包体本身。**不要写本地路径**。
- `devices`：包内 `@device(id=…)` 的列表，用于搜索和配置设备时预览；不校验真实性，
  微后端装完会自己 AST 扫描一遍。
- `official`：缺省 `true`（本索引即官方目录）；社区维护的包请标 `false`。

## 收录一个包

1. 包是含 `@device` / `@resource` 的源码树，`pyproject.toml` 写明 `[project].name` 与依赖（参考上面任一 demo）；
2. 在 `index.json` 的 `packages` 末尾追加一条，更新 `updated_at`；
3. `node scripts/validate.mjs` 通过（CI 也会跑）；
4. 提 PR。

## 在别处使用这份索引

- **OpenLab 前端**：默认地址就是本仓库的 `main/index.json`；页面上可临时换成别的地址
  （比如内网镜像），也可在构建时用 `VITE_OPENLAB_DEVICE_INDEX_URL` 改默认值。
- **微后端侧镜像**：浏览器出不了网时，把本文件放到内网并在 Edge 的 `local_config.py`
  里设 `HTTPConfig.driver_package_index_url`，`GET /api/v1/driver-packages/catalog` 会把它并进目录。
- **本地补充**：Edge 的 `unilabos_data/driver_package_catalog.json` 用同样结构登记实验室自用包。
