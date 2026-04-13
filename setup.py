from setuptools import setup, find_packages

setup(
    name="neotec_van_pos",
    version="2.1.1",
    description="Neotec VAN POS v2 for Frappe/ERPNext",
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
)
