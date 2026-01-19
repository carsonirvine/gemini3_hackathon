# # goes through all courses file and
# # outputs a list of all possible subjects


# import json

# # 1. Load the file
# with open('all_data.json', 'r', encoding='utf-8') as file:
#     data = json.load(file)

# # 2. Extract unique subjects and sort them
# unique_subjects = sorted(list(set(item['instructionalMethod'] for item in data)))

# # 3. Print or save the results
# print(f"Found {len(unique_subjects)} unique methods:")
# print(unique_subjects)

print(len(['ADMN', 'AE', 'AHVS', 'ANTH', 'ART', 'ASL', 'ASTR', 'ATWP', 'BCMB', 'BIOC', 'BIOL', 'BME', 'BUS', 'CD', 'CE', 'CHEM', 'CIVE', 'CNPY', 'COM', 'CS', 'CSC', 'CSPT', 'CW', 'CYC', 'DR', 'ECE', 'ECON', 'ED-D', 'ED-P', 'EDCI', 'ENGR', 'ENSH', 'ENT', 'EOS', 'EPHE', 'ER', 'ES', 'EUS', 'FA', 'FORB', 'FRAN', 'GDS', 'GEOG', 'GMST', 'GNDR', 'GREE', 'GRS', 'GS', 'HINF', 'HLTH', 'HSTR', 'HUMA', 'ICDG', 'IED', 'IGOV', 'IN', 'INDW', 'INGH', 'INTD', 'INTS', 'IS', 'ISP', 'ITAL', 'LAS', 'LATI', 'LAW', 'LING', 'MATH', 'MBA', 'MDIA', 'MECH', 'MEDI', 'MEDS', 'MGB', 'MICR', 'MUS', 'NRSC', 'NUED', 'NUHI', 'NUNP', 'NURA', 'NURS', 'PAAS', 'PHIL', 'PHSP', 'PHYS', 'POLI', 'PSYC', 'RCS', 'SCIE', 'SDH', 'SENG', 'SJS', 'SLST', 'SOCI', 'SOCW', 'SPAN', 'STAT', 'TCA', 'THEA', 'TS', 'WRIT']))